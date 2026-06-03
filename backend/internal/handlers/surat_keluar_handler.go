package handlers

import (
	"net/http"
	"strconv"

	"disposisi-surat/internal/config"
	"disposisi-surat/internal/models"
	"disposisi-surat/internal/repository"

	"github.com/gin-gonic/gin"
)

type SuratKeluarHandler struct {
	cfg       *config.Config
	skRepo    *repository.SuratKeluarRepository
	notifRepo *repository.NotificationRepository
	actRepo   *repository.ActivityLogRepository
	userRepo  *repository.UserRepository
}

func NewSuratKeluarHandler(cfg *config.Config, sk *repository.SuratKeluarRepository, n *repository.NotificationRepository, a *repository.ActivityLogRepository, u *repository.UserRepository) *SuratKeluarHandler {
	return &SuratKeluarHandler{cfg: cfg, skRepo: sk, notifRepo: n, actRepo: a, userRepo: u}
}

func (h *SuratKeluarHandler) Create(c *gin.Context) {
	kodeSuratStr := c.PostForm("kode_surat")
	noSurat := c.PostForm("no_surat")
	perihal := c.PostForm("perihal")
	tglSurat := c.PostForm("tanggal_surat")
	dari := c.PostForm("tujuan") // Field "tujuan" in DB but used as "dari" in form

	kodeSurat, _ := strconv.Atoi(kodeSuratStr)

	// Validate all required fields are not empty
	if kodeSurat == 0 || noSurat == "" || perihal == "" || tglSurat == "" || dari == "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Semua field wajib harus diisi (Dari, Kode Surat, No. Surat, Perihal, Tanggal)"})
		return
	}
	// File lampiran WAJIB
	filePDF, err := savePDFFile(c, "file_pdf", h.cfg.UploadDir, "sk")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Gagal mengunggah file: " + err.Error()})
		return
	}
	userID := c.GetInt("user_id")
	surat := &models.SuratKeluar{KodeSurat: kodeSurat, NoSurat: noSurat, Perihal: perihal, TanggalSurat: tglSurat, FilePDF: filePDF, Tujuan: dari}
	if err := h.skRepo.Create(surat); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal membuat surat keluar"})
		return
	}
	// Notify kepsek for new surat keluar
	kepsekUsers, _ := h.userRepo.FindByRole("kepsek")
	for _, k := range kepsekUsers {
		h.notifRepo.Create(&models.Notification{IDPenerima: k.ID, IDPengirim: &userID, Judul: "Surat Keluar Baru", Pesan: "Surat keluar baru: " + perihal, Jenis: "surat_keluar_baru", TipeReferensi: "surat_keluar", IDReferensi: &surat.ID})
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "BUAT_SURAT_KELUAR", TabelTerkait: "surat_keluar"})
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "Surat keluar berhasil dibuat", Data: surat})
}

// List: admin/kepsek see active surat (menunggu), users only see disetujui
func (h *SuratKeluarHandler) List(c *gin.Context) {
	status := c.Query("status")
	role, _ := c.Get("role")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	var list []models.SuratKeluar
	var err error

	if role == "user" {
		// Users only see disetujui surat keluar (NOT menunggu)
		list, err = h.skRepo.FindByStatusWithDateRange("disetujui", dateFrom, dateTo)
	} else if status != "" {
		list, err = h.skRepo.FindByStatusWithDateRange(status, dateFrom, dateTo)
	} else {
		// For admin/kepsek: show only active surat (menunggu) so it doesn't conflict with history
		list, err = h.skRepo.FindActiveWithDateRange(dateFrom, dateTo)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data"})
		return
	}
	if list == nil {
		list = []models.SuratKeluar{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: list})
}

// History endpoint for surat keluar
func (h *SuratKeluarHandler) ListHistory(c *gin.Context) {
	statusFilter := c.Query("status")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")
	list, err := h.skRepo.FindHistoryWithDateRange(statusFilter, dateFrom, dateTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data"})
		return
	}
	if list == nil {
		list = []models.SuratKeluar{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: list})
}

func (h *SuratKeluarHandler) GetByID(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.skRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	userID := c.GetInt("user_id")
	_ = h.notifRepo.MarkAsReadByReferensi(userID, id, "surat_keluar")
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: surat})
}

func (h *SuratKeluarHandler) Update(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.skRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	if surat.StatusVerifikasi != "menunggu" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Hanya surat menunggu yang bisa diedit"})
		return
	}
	if v := c.PostForm("kode_surat"); v != "" {
		if k, err := strconv.Atoi(v); err == nil { surat.KodeSurat = k }
	}
	if v := c.PostForm("no_surat"); v != "" { surat.NoSurat = v }
	if v := c.PostForm("perihal"); v != "" { surat.Perihal = v }
	if v := c.PostForm("tanggal_surat"); v != "" { surat.TanggalSurat = v }
	if v := c.PostForm("tujuan"); v != "" { surat.Tujuan = v }
	if f, err := savePDFFile(c, "file_pdf", h.cfg.UploadDir, "sk"); err == nil && f != "" {
		h.skRepo.UpdateFilePDF(id, f)
	} else if err != nil && err != http.ErrMissingFile {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Gagal mengunggah file: " + err.Error()})
		return
	}
	h.skRepo.Update(surat)
	h.actRepo.Create(&models.ActivityLog{IDUser: c.GetInt("user_id"), Aksi: "EDIT_SURAT_KELUAR", TabelTerkait: "surat_keluar"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil diupdate", Data: surat})
}

func (h *SuratKeluarHandler) Review(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.skRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	if surat.StatusVerifikasi != "menunggu" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Surat sudah direview"})
		return
	}
	var req models.ReviewSuratKeluarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid"})
		return
	}
	userID := c.GetInt("user_id")
	h.skRepo.UpdateStatus(id, req.Status, req.Catatan, userID)

	// Notify admins about review result
	statusLabel := "disetujui"
	if req.Status == "ditolak" {
		statusLabel = "ditolak"
	}
	admins, _ := h.userRepo.FindByRole("admin")
	for _, a := range admins {
		h.notifRepo.Create(&models.Notification{IDPenerima: a.ID, IDPengirim: &userID, Judul: "Surat Keluar " + statusLabel, Pesan: "Surat " + surat.NoSurat + " telah " + statusLabel + " oleh Kepsek", Jenis: "review_surat", TipeReferensi: "surat_keluar", IDReferensi: &id})
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "REVIEW_SURAT_KELUAR", TabelTerkait: "surat_keluar"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil di-review"})
}

func (h *SuratKeluarHandler) Archive(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	_, err := h.skRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	userID := c.GetInt("user_id")
	h.skRepo.UpdateStatus(id, "diarsipkan", "", userID)
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "ARSIP_SURAT_KELUAR", TabelTerkait: "surat_keluar"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat diarsipkan"})
}

// Delete surat keluar (only if status menunggu, admin/TU only)
func (h *SuratKeluarHandler) Delete(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	surat, err := h.skRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Surat tidak ditemukan"})
		return
	}
	if surat.StatusVerifikasi != "menunggu" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Hanya surat yang belum di-approve yang bisa dihapus"})
		return
	}
	if err := h.skRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal menghapus surat"})
		return
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: c.GetInt("user_id"), Aksi: "HAPUS_SURAT_KELUAR", TabelTerkait: "surat_keluar"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil dihapus"})
}
