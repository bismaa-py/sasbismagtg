package handlers

import (
	"net/http"
	"strconv"
	"unicode"

	"disposisi-surat/internal/models"
	"disposisi-surat/internal/repository"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	userRepo *repository.UserRepository
	actRepo  *repository.ActivityLogRepository
}

func NewUserHandler(ur *repository.UserRepository, ar *repository.ActivityLogRepository) *UserHandler {
	return &UserHandler{userRepo: ur, actRepo: ar}
}

func (h *UserHandler) List(c *gin.Context) {
	users, err := h.userRepo.FindAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data pengguna"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: users})
}

func (h *UserHandler) ListByRole(c *gin.Context) {
	role := c.Query("role")
	if role == "" {
		h.List(c)
		return
	}
	users, err := h.userRepo.FindByRole(role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: users})
}

// validatePassword checks password meets requirements: min 8 chars, uppercase, lowercase, number
func validatePassword(pw string) string {
	if len(pw) < 8 {
		return "Password harus minimal 8 karakter"
	}
	var hasUpper, hasLower, hasDigit bool
	for _, ch := range pw {
		if unicode.IsUpper(ch) {
			hasUpper = true
		}
		if unicode.IsLower(ch) {
			hasLower = true
		}
		if unicode.IsDigit(ch) {
			hasDigit = true
		}
	}
	if !hasUpper {
		return "Password harus mengandung huruf besar"
	}
	if !hasLower {
		return "Password harus mengandung huruf kecil"
	}
	if !hasDigit {
		return "Password harus mengandung angka"
	}
	return ""
}

// Create user with password validation (min 8 chars, uppercase & lowercase, number)
func (h *UserHandler) Create(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid: " + err.Error()})
		return
	}

	// Validate password strength
	if errMsg := validatePassword(req.Password); errMsg != "" {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: errMsg})
		return
	}

	// Check if email already exists
	if existing, _ := h.userRepo.FindByEmail(req.Email); existing != nil {
		c.JSON(http.StatusConflict, models.APIResponse{Success: false, Message: "Email sudah terdaftar"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal enkripsi password"})
		return
	}

	// Proteksi: Tidak boleh membuat akun baru dengan jabatan Kepala Sekolah atau Admin / Tata Usaha
	if len(req.IDJabatan) > 0 {
		for _, jid := range req.IDJabatan {
			isAdminOrKepsek, err := h.userRepo.IsAdminOrKepsekJabatan(jid)
			if err != nil {
				c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal memverifikasi jabatan"})
				return
			}
			if isAdminOrKepsek {
				c.JSON(http.StatusForbidden, models.APIResponse{Success: false, Message: "Jabatan Kepala Sekolah atau Admin / Tata Usaha tidak dapat ditambahkan pada akun baru"})
				return
			}
		}
	}

	user := &models.User{
		Nama:     req.Nama,
		Email:    req.Email,
		Password: string(hash),
	}

	if err := h.userRepo.Create(user); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal membuat akun"})
		return
	}

	// Assign multiple jabatan
	if len(req.IDJabatan) > 0 {
		for i, jid := range req.IDJabatan {
			isPrimary := (i == 0) // First jabatan is primary
			h.userRepo.AssignJabatan(user.ID, jid, isPrimary)
		}
	}

	// Re-fetch to get role info
	user, _ = h.userRepo.FindByID(user.ID)

	adminID := c.GetInt("user_id")
	h.actRepo.Create(&models.ActivityLog{IDUser: adminID, Aksi: "BUAT_AKUN", TabelTerkait: "users"})

	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "Akun berhasil dibuat", Data: user})
}

// Update user with password validation
func (h *UserHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "ID tidak valid"})
		return
	}

	user, err := h.userRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Pengguna tidak ditemukan"})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid"})
		return
	}

	if req.Nama != "" {
		user.Nama = req.Nama
	}
	if req.Email != "" {
		user.Email = req.Email
	}

	if err := h.userRepo.Update(user); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal update akun"})
		return
	}

	if req.Password != "" {
		// Validate password strength
		if errMsg := validatePassword(req.Password); errMsg != "" {
			c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: errMsg})
			return
		}
		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		h.userRepo.UpdatePassword(id, string(hash))
	}

	// Update multiple jabatan if provided - BUT block for admin/kepsek
	if len(req.IDJabatan) > 0 {
		if user.Role == "admin" || user.Role == "kepsek" {
			c.JSON(http.StatusForbidden, models.APIResponse{Success: false, Message: "Jabatan akun Admin/TU dan Kepala Sekolah tidak dapat diubah"})
			return
		}
		// Proteksi: Tidak boleh mengubah jabatan akun lain menjadi Kepala Sekolah atau Admin / Tata Usaha
		for _, jid := range req.IDJabatan {
			isAdminOrKepsek, err := h.userRepo.IsAdminOrKepsekJabatan(jid)
			if err != nil {
				c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal memverifikasi jabatan"})
				return
			}
			if isAdminOrKepsek {
				c.JSON(http.StatusForbidden, models.APIResponse{Success: false, Message: "Jabatan Kepala Sekolah atau Admin / Tata Usaha tidak dapat ditambahkan pada akun"})
				return
			}
		}
		h.userRepo.RemoveAllJabatan(id)
		for i, jid := range req.IDJabatan {
			isPrimary := (i == 0)
			h.userRepo.AssignJabatan(id, jid, isPrimary)
		}
	}

	// Re-fetch
	user, _ = h.userRepo.FindByID(id)

	adminID := c.GetInt("user_id")
	h.actRepo.Create(&models.ActivityLog{IDUser: adminID, Aksi: "EDIT_AKUN", TabelTerkait: "users"})

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Akun berhasil diupdate", Data: user})
}

// Delete completely removes user from database
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "ID tidak valid"})
		return
	}

	user, err := h.userRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Pengguna tidak ditemukan"})
		return
	}

	// Proteksi: Admin/TU dan Kepsek tidak boleh dihapus
	if user.Role == "admin" || user.Role == "kepsek" {
		c.JSON(http.StatusForbidden, models.APIResponse{Success: false, Message: "Akun Admin/TU dan Kepala Sekolah tidak dapat dihapus"})
		return
	}

	if err := h.userRepo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal hapus akun: " + err.Error()})
		return
	}

	adminID := c.GetInt("user_id")
	h.actRepo.Create(&models.ActivityLog{IDUser: adminID, Aksi: "HAPUS_AKUN", TabelTerkait: "users"})

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Akun berhasil dihapus dari database"})
}

func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "ID tidak valid"})
		return
	}
	user, err := h.userRepo.FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Pengguna tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: user})
}
