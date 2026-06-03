package handlers

import (
	"net/http"
	"strconv"

	"disposisi-surat/internal/config"
	"disposisi-surat/internal/models"
	"disposisi-surat/internal/repository"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type ProfileHandler struct {
	cfg      *config.Config
	userRepo *repository.UserRepository
	otpRepo  *repository.OTPRepository
	actRepo  *repository.ActivityLogRepository
}

func NewProfileHandler(cfg *config.Config, ur *repository.UserRepository, or *repository.OTPRepository, ar *repository.ActivityLogRepository) *ProfileHandler {
	return &ProfileHandler{cfg: cfg, userRepo: ur, otpRepo: or, actRepo: ar}
}

func (h *ProfileHandler) Get(c *gin.Context) {
	userID := c.GetInt("user_id")
	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "User tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: user})
}

// Feature 18: Profile update removed - users/kepsek cannot change nama, akun, jabatan
func (h *ProfileHandler) Update(c *gin.Context) {
	c.JSON(http.StatusForbidden, models.APIResponse{Success: false, Message: "Anda tidak dapat mengubah profil. Hubungi admin."})
}

// Feature 20: Change password requires OTP verification first
func (h *ProfileHandler) ChangePassword(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req models.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid: " + err.Error()})
		return
	}

	// Verify OTP first
	otp, err := h.otpRepo.FindValid(userID, req.OTPCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Kode OTP tidak valid atau sudah kadaluarsa"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	h.userRepo.UpdatePassword(userID, string(hash))
	h.otpRepo.MarkUsed(otp.ID)
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "GANTI_PASSWORD", TabelTerkait: "users"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Password berhasil diubah"})
}

// Feature 14: Upload foto profil for all roles
func (h *ProfileHandler) UploadPhoto(c *gin.Context) {
	userID := c.GetInt("user_id")
	filename, err := saveFile(c, "foto", h.cfg.UploadDir, "avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Gagal upload foto: " + err.Error()})
		return
	}
	if err := h.userRepo.UpdateFotoProfil(userID, filename); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal menyimpan foto"})
		return
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "UPDATE_FOTO_PROFIL", TabelTerkait: "users"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Foto profil berhasil diupdate", Data: gin.H{"foto_profil": filename}})
}

// Hapus foto profil - semua role bisa hapus
func (h *ProfileHandler) DeletePhoto(c *gin.Context) {
	userID := c.GetInt("user_id")

	if err := h.userRepo.UpdateFotoProfil(userID, ""); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal menghapus foto profil"})
		return
	}
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "HAPUS_FOTO_PROFIL", TabelTerkait: "users"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Foto profil berhasil dihapus"})
}

// Feature 5: Switch active jabatan for users with multiple jabatan
func (h *ProfileHandler) SwitchJabatan(c *gin.Context) {
	userID := c.GetInt("user_id")
	var req struct {
		IDJabatan int `json:"id_jabatan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "ID jabatan tidak valid"})
		return
	}

	// Verify user has this jabatan
	jabatanList, err := h.userRepo.FindJabatanByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data jabatan"})
		return
	}

	found := false
	for _, j := range jabatanList {
		if j.IDJabatan == req.IDJabatan {
			found = true
			break
		}
	}
	if !found {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Jabatan tidak ditemukan untuk user ini"})
		return
	}

	// Set all jabatan to non-primary first, then set the selected one as primary
	if err := h.userRepo.SetPrimaryJabatan(userID, req.IDJabatan); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal switch jabatan"})
		return
	}

	// Re-fetch user to return updated data
	user, _ := h.userRepo.FindByID(userID)
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "SWITCH_JABATAN", TabelTerkait: "user_jabatan"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Jabatan berhasil diubah", Data: user})
}

// === Disposisi Handler ===
type DisposisiHandler struct {
	dispRepo  *repository.DisposisiRepository
	notifRepo *repository.NotificationRepository
	actRepo   *repository.ActivityLogRepository
	userRepo  *repository.UserRepository
}

func NewDisposisiHandler(d *repository.DisposisiRepository, n *repository.NotificationRepository, a *repository.ActivityLogRepository, u *repository.UserRepository) *DisposisiHandler {
	return &DisposisiHandler{dispRepo: d, notifRepo: n, actRepo: a, userRepo: u}
}

func (h *DisposisiHandler) ListByUser(c *gin.Context) {
	userID := c.GetInt("user_id")
	list, err := h.dispRepo.FindByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: list})
}

// Confirm: User marks surat as received → notify admin/TU
func (h *DisposisiHandler) Confirm(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")
	if err := h.dispRepo.UpdateStatusDisposisi(id, userID, "dibaca"); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal konfirmasi"})
		return
	}

	// Get user name for notification message
	userName := "User"
	if u, err := h.userRepo.FindByID(userID); err == nil {
		userName = u.Nama
	}

	// Notify all admin/TU that user has received the surat
	admins, _ := h.userRepo.FindByRole("admin")
	for _, a := range admins {
		h.notifRepo.Create(&models.Notification{
			IDPenerima:    a.ID,
			IDPengirim:    &userID,
			Judul:         "Surat Telah Diterima",
			Pesan:         userName + " telah menerima dan membaca surat disposisi",
			Jenis:         "disposisi_diterima",
			TipeReferensi: "disposisi",
		})
	}

	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "TERIMA_SURAT", TabelTerkait: "disposisi"})
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Surat berhasil diterima"})
}

// === Notification Handler ===
type NotificationHandler struct {
	notifRepo *repository.NotificationRepository
}

func NewNotificationHandler(n *repository.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{notifRepo: n}
}

func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.GetInt("user_id")
	list, err := h.notifRepo.FindByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil notifikasi"})
		return
	}
	if list == nil {
		list = []models.Notification{}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: list})
}

func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID := c.GetInt("user_id")
	count, _ := h.notifRepo.CountUnread(userID)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: gin.H{"count": count}})
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID := c.GetInt("user_id")
	h.notifRepo.MarkAsRead(id, userID)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Notifikasi dibaca"})
}

func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID := c.GetInt("user_id")
	h.notifRepo.MarkAllAsRead(userID)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Semua notifikasi dibaca"})
}

// === Activity Log Handler ===
type ActivityHandler struct {
	actRepo *repository.ActivityLogRepository
}

func NewActivityHandler(a *repository.ActivityLogRepository) *ActivityHandler {
	return &ActivityHandler{actRepo: a}
}

func (h *ActivityHandler) List(c *gin.Context) {
	list, err := h.actRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil log"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: list})
}

// === Dashboard Handler ===
type DashboardHandler struct {
	smRepo   *repository.SuratMasukRepository
	skRepo   *repository.SuratKeluarRepository
	userRepo *repository.UserRepository
	dispRepo *repository.DisposisiRepository
}

func NewDashboardHandler(sm *repository.SuratMasukRepository, sk *repository.SuratKeluarRepository, u *repository.UserRepository, d *repository.DisposisiRepository) *DashboardHandler {
	return &DashboardHandler{smRepo: sm, skRepo: sk, userRepo: u, dispRepo: d}
}

// Feature 4: Admin: Surat Masuk, Surat Keluar, Menunggu Persetujuan, History
// Feature 9: Kepsek: "Menunggu Persetujuan"
// Feature 10/feedback: User: Surat Masuk, Surat Keluar, History only
func (h *DashboardHandler) Stats(c *gin.Context) {
	stats := models.DashboardStats{}

	role, _ := c.Get("role")

	if role == "user" {
		// User only sees Surat Masuk (forwarded, unconfirmed), Surat Keluar, History (confirmed)
		userID := c.GetInt("user_id")
		// Surat Masuk = only unconfirmed surat (belum diterima)
		stats.TotalSuratMasuk, _ = h.smRepo.CountByRecipientUserUnconfirmed(userID)
		stats.TotalSuratKeluar, _ = h.skRepo.CountAll()
		// History = only confirmed/received surat
		stats.TotalHistory, _ = h.smRepo.CountByRecipientUserConfirmed(userID)
	} else {
		// Admin + Kepsek + Pegawai
		stats.TotalSuratMasuk, _ = h.smRepo.CountAll()
		stats.TotalSuratKeluar, _ = h.skRepo.CountAll()

		smMenunggu, _ := h.smRepo.CountByStatus("menunggu")
		skMenunggu, _ := h.skRepo.CountByStatus("menunggu")
		stats.SuratMenungguPersetujuan = smMenunggu + skMenunggu

		smHistory, _ := h.smRepo.CountHistory()
		skHistory, _ := h.skRepo.CountHistory()
		stats.TotalHistory = smHistory + skHistory

		if role == "admin" {
			stats.TotalUsers, _ = h.userRepo.Count()
		}
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: stats})
}
