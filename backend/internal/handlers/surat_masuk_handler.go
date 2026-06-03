package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"disposisi-surat/internal/config"
	"disposisi-surat/internal/models"
	"disposisi-surat/internal/repository"

	"github.com/gin-gonic/gin"
)

type SuratMasukHandler struct {
	cfg       *config.Config
	smRepo    *repository.SuratMasukRepository
	dispRepo  *repository.DisposisiRepository
	notifRepo *repository.NotificationRepository
	actRepo   *repository.ActivityLogRepository
	userRepo  *repository.UserRepository
}

func NewSuratMasukHandler(cfg *config.Config, sm *repository.SuratMasukRepository, d *repository.DisposisiRepository, n *repository.NotificationRepository, a *repository.ActivityLogRepository, u *repository.UserRepository) *SuratMasukHandler {
	return &SuratMasukHandler{cfg: cfg, smRepo: sm, dispRepo: d, notifRepo: n, actRepo: a, userRepo: u}
}

func saveFile(c *gin.Context, fieldName, uploadDir, prefix string) (string, error) {
	file, header, err := c.Request.FormFile(fieldName)
	if err != nil {
		return "", err
	}
	defer file.Close()
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), ext)
	out, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		return "", err
	}
	defer out.Close()
	io.Copy(out, file)
	return filename, nil
}

// savePDFFile saves a file only if it is a PDF under 2MB
func savePDFFile(c *gin.Context, fieldName, uploadDir, prefix string) (string, error) {
	file, header, err := c.Request.FormFile(fieldName)
	if err != nil {
		return "", err
	}
	defer file.Close()

	// Check size: max 2MB (2 * 1024 * 1024 bytes)
	if header.Size > 2*1024*1024 {
		return "", fmt.Errorf("ukuran file melebihi batas maksimal 2 MB")
	}

	// Check extension: only PDF allowed
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".pdf" {
		return "", fmt.Errorf("format file harus PDF")
	}

	filename := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), ext)
	out, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		return "", err
	}
	defer out.Close()
	io.Copy(out, file)
	return filename, nil
}

func (h *SuratMasukHandler) Create(c *gin.Context) {
	noSurat := c.PostForm("no_surat")
	perihal := c.PostForm("perihal_surat")
	asal := c.PostForm("asal_surat")
	tglSurat := c.PostForm("tanggal_surat")
	if noSurat == "" || perihal == "" || asal == "" || tglSurat == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Semua field wajib harus diisi (No. Surat, Perihal, Asal, Tanggal)"})
		return
	}

	// File lampiran WAJIB
	filePDF, err := savePDFFile(c, "file_pdf", h.cfg.UploadDir, "sm")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Gagal mengunggah file: " + err.Error()})
		return
	}

	userID := c.GetInt("user_id")
	surat := &models.SuratMasuk{NoSurat: noSurat, PerihalSurat: perihal, AsalSurat: asal, TanggalSurat: tglSurat, FilePDF: filePDF}
	if err := h.smRepo.Create(surat); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal membuat surat: " + err.Error()})
		return
	}
	// Notify kepsek (triggers bell notification)
	kepsekUsers, _ := h.userRepo.FindByRole("kepsek")
	for _, k := range kepsekUsers {
		h.notifRepo.Create(&models.Notification{IDPenerima: k.ID, IDPengirim: &userID, Judul: "Surat Masuk Baru", Pesan: "Surat masuk baru: " + perihal, Jenis: "surat_masuk_baru", TipeReferensi: "surat_masuk", IDReferensi: &surat.ID})
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "BUAT_SURAT_MASUK", TabelTerkait: "surat_masuk"})
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "Surat masuk berhasil dibuat", Data: surat})
}

// List: admin/kepsek see only menunggu+belum dikirim, users see their forwarded surat (unconfirmed only)
func (h *SuratMasukHandler) List(c *gin.Context) {
	status := c.Query("status")
	role, _ := c.Get("role")
	userID := c.GetInt("user_id")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	jabatanID := c.Query("jabatan_id") // Filter by jabatan for users

	var list []models.SuratMasuk
	var err error

	// Users only see surat that were forwarded to them AND not yet confirmed
	if role == "user" {
		var jabID int
		if jabatanID != "" {
			jabID, _ = strconv.Atoi(jabatanID)
		}
		list, err = h.smRepo.FindByRecipientUserWithDateRange(userID, dateFrom, dateTo, jabID)
	} else if status == "menunggu" {
		list, err = h.smRepo.FindByStatusWithDateRange("menunggu", dateFrom, dateTo)
	} else if status != "" {
		list, err = h.smRepo.FindByStatusWithDateRange(status, dateFrom, dateTo)
	} else if role == "kepsek" {
		// Kepsek: show only "menunggu" since approved/rejected goes straight to history
		list, err = h.smRepo.FindByStatusWithDateRange("menunggu", dateFrom, dateTo)
	} else {
		// For admin/pegawai: show active surat (menunggu + disetujui belum diteruskan)
		list, err = h.smRepo.FindActiveWithDateRange(dateFrom, dateTo)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data"})
		return
	}
	if list == nil {
		list = []models.SuratMasuk{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: list})
}

// History endpoint: show surat that have been fully processed
// For users: shows only surat they have opened/read (auto-confirmed)
// For kepsek: shows surat they have approved/rejected (immediate riwayat on ACC)
// For admin: shows surat that are diteruskan/ditolak/selesai
func (h *SuratMasukHandler) ListHistory(c *gin.Context) {
	role, _ := c.Get("role")
	userID := c.GetInt("user_id")
	statusFilter := c.Query("status")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	jabatanID := c.Query("jabatan_id")

	var list []models.SuratMasuk
	var err error

	if role == "user" {
		var jabID int
		if jabatanID != "" {
			jabID, _ = strconv.Atoi(jabatanID)
		}
		list, err = h.smRepo.FindByRecipientUserConfirmedWithDateRange(userID, dateFrom, dateTo, jabID)
	} else if role == "kepsek" {
		// Kepsek: surat yang sudah di-ACC/ditolak langsung masuk riwayat
		list, err = h.smRepo.FindHistoryKepsekWithDateRange(statusFilter, dateFrom, dateTo)
	} else {
		list, err = h.smRepo.FindHistoryWithDateRange(statusFilter, dateFrom, dateTo)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data"})
		return
	}
	if list == nil {
		list = []models.SuratMasuk{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: list})
}

func (h *SuratMasukHandler) GetByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.smRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	disposisi, _ := h.dispRepo.FindBySuratMasukID(id)

	// Auto-read: jika user membuka surat dan punya disposisi belum dibaca, otomatis tandai dibaca
	userID := c.GetInt("user_id")
	_ = h.notifRepo.MarkAsReadByReferensi(userID, id, "surat_masuk")
	hasUpdated := false
	for _, d := range disposisi {
		if d.IDPenerima == userID && d.StatusDisposisi != "dibaca" {
			// Tandai disposisi sebagai dibaca
			err := h.dispRepo.UpdateStatusDisposisi(d.ID, userID, "dibaca")
			if err == nil {
				hasUpdated = true
			}
		}
	}
	if hasUpdated {
		// Get user name for notification
		userName := "User"
		if u, err := h.userRepo.FindByID(userID); err == nil {
			userName = u.Nama
		}

		// Notify admin/TU bahwa user sudah membuka surat
		admins, _ := h.userRepo.FindByRole("admin")
		pegawai, _ := h.userRepo.FindByRole("pegawai")
		allTargets := append(admins, pegawai...)
		for _, a := range allTargets {
			h.notifRepo.Create(&models.Notification{
				IDPenerima:    a.ID,
				IDPengirim:    &userID,
				Judul:         "Surat Telah Dibuka",
				Pesan:         userName + " telah membuka dan membaca surat: " + surat.PerihalSurat,
				Jenis:         "disposisi_diterima",
				TipeReferensi: "surat_masuk",
			})
		}

		h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "BUKA_SURAT", TabelTerkait: "disposisi"})

		// Re-fetch disposisi setelah update agar response terbaru
		disposisi, _ = h.dispRepo.FindBySuratMasukID(id)
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: gin.H{"surat": surat, "disposisi": disposisi}})
}

func (h *SuratMasukHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.smRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	if surat.StatusVerifikasi != "menunggu" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Hanya surat menunggu yang bisa diedit"})
		return
	}
	if v := c.PostForm("no_surat"); v != "" { surat.NoSurat = v }
	if v := c.PostForm("perihal_surat"); v != "" { surat.PerihalSurat = v }
	if v := c.PostForm("asal_surat"); v != "" { surat.AsalSurat = v }
	if v := c.PostForm("tanggal_surat"); v != "" { surat.TanggalSurat = v }
	if f, err := savePDFFile(c, "file_pdf", h.cfg.UploadDir, "sm"); err == nil && f != "" {
		h.smRepo.UpdateFilePDF(id, f)
	} else if err != nil && err != http.ErrMissingFile {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Gagal mengunggah file: " + err.Error()})
		return
	}
	h.smRepo.Update(surat)
	h.actRepo.Create(&models.ActivityLog{IDUser: c.GetInt("user_id"), Aksi: "EDIT_SURAT_MASUK", TabelTerkait: "surat_masuk"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil diupdate", Data: surat})
}

// Review: Kepsek ONLY approve/reject. NO forwarding here. Forwarding is admin/pegawai via Forward().
func (h *SuratMasukHandler) Review(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.smRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	if surat.StatusVerifikasi != "menunggu" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Surat sudah direview"})
		return
	}
	var req models.ReviewSuratMasukRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid"})
		return
	}
	userID := c.GetInt("user_id")

	// Jika kepsek memilih target penerima, tambahkan info ke catatan
	catatan := req.Catatan
	if req.Status == "disetujui" && len(req.TargetPenerima) > 0 {
		penerimaInfo := "\n[Diteruskan kepada: "
		for i, nama := range req.TargetPenerima {
			if i > 0 {
				penerimaInfo += ", "
			}
			penerimaInfo += nama
		}
		penerimaInfo += "]"
		catatan += penerimaInfo
	}
	h.smRepo.UpdateStatus(id, req.Status, catatan, userID)

	if req.Status == "disetujui" {
		h.smRepo.UpdateStatusAlur(id, "disposisi_kepsek")
		// Kepsek does NOT forward. Only marks as disetujui. Admin/pegawai forwards later.
	}

	// Notify admins and pegawai about review result
	admins, _ := h.userRepo.FindByRole("admin")
	pegawai, _ := h.userRepo.FindByRole("pegawai")
	statusLabel := "disetujui"
	if req.Status == "ditolak" {
		statusLabel = "ditolak"
	}
	allTargets := append(admins, pegawai...)
	for _, a := range allTargets {
		h.notifRepo.Create(&models.Notification{IDPenerima: a.ID, IDPengirim: &userID, Judul: "Surat Masuk " + statusLabel, Pesan: "Surat " + surat.NoSurat + " telah " + statusLabel + " oleh Kepsek", Jenis: "review_surat", TipeReferensi: "surat_masuk", IDReferensi: &id})
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "REVIEW_SURAT_MASUK", TabelTerkait: "surat_masuk"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil di-review"})
}

// Forward: ADMIN ONLY - forward approved surat to users (with optional jabatan)
func (h *SuratMasukHandler) Forward(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.smRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	if surat.StatusVerifikasi != "disetujui" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Surat harus disetujui terlebih dahulu oleh Kepsek"})
		return
	}
	var req models.ForwardSuratMasukRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid"})
		return
	}
	userID := c.GetInt("user_id")

	// New format: targets with jabatan
	if len(req.Targets) > 0 {
		for _, t := range req.Targets {
			jabatanID := t.JabatanID
			var jabPtr *int
			if jabatanID > 0 {
				jabPtr = &jabatanID
			}
			h.dispRepo.Create(&models.Disposisi{IDSuratMasuk: id, IDKepsek: userID, IDPenerima: t.UserID, IDJabatanPenerima: jabPtr})
			h.notifRepo.Create(&models.Notification{IDPenerima: t.UserID, IDPengirim: &userID, Judul: "Surat Baru Untuk Anda", Pesan: "Disposisi: " + surat.PerihalSurat, Jenis: "surat_diteruskan", TipeReferensi: "surat_masuk", IDReferensi: &id})
		}
	} else if len(req.DiteruskanKe) > 0 {
		// Old format: just user IDs (backward compat)
		for _, uid := range req.DiteruskanKe {
			h.dispRepo.Create(&models.Disposisi{IDSuratMasuk: id, IDKepsek: userID, IDPenerima: uid})
			h.notifRepo.Create(&models.Notification{IDPenerima: uid, IDPengirim: &userID, Judul: "Surat Baru Untuk Anda", Pesan: "Disposisi: " + surat.PerihalSurat, Jenis: "surat_diteruskan", TipeReferensi: "surat_masuk", IDReferensi: &id})
		}
	} else {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Pilih minimal 1 penerima"})
		return
	}

	h.smRepo.UpdateStatusAlur(id, "diteruskan")
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "TERUSKAN_SURAT", TabelTerkait: "surat_masuk"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil diteruskan"})
}

func (h *SuratMasukHandler) Archive(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	_, err := h.smRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	h.smRepo.UpdateStatusAlur(id, "selesai")
	h.actRepo.Create(&models.ActivityLog{IDUser: c.GetInt("user_id"), Aksi: "ARSIP_SURAT", TabelTerkait: "surat_masuk"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat diarsipkan"})
}

// Delete surat masuk (only if status menunggu, admin/TU only)
func (h *SuratMasukHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.smRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	if surat.StatusVerifikasi != "menunggu" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Hanya surat yang belum di-approve yang bisa dihapus"})
		return
	}
	if err := h.smRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal menghapus surat"})
		return
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: c.GetInt("user_id"), Aksi: "HAPUS_SURAT_MASUK", TabelTerkait: "surat_masuk"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil dihapus"})
}
