package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"disposisi-surat/internal/config"
	"disposisi-surat/internal/models"
	"disposisi-surat/internal/repository"

	"github.com/gin-gonic/gin"
)

type SchoolHandler struct {
	cfg        *config.Config
	schoolRepo *repository.SchoolRepository
	actRepo    *repository.ActivityLogRepository
}

func NewSchoolHandler(cfg *config.Config, sr *repository.SchoolRepository, ar *repository.ActivityLogRepository) *SchoolHandler {
	return &SchoolHandler{cfg: cfg, schoolRepo: sr, actRepo: ar}
}

func (h *SchoolHandler) Get(c *gin.Context) {
	s, err := h.schoolRepo.Get()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil informasi sekolah: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: s})
}

func (h *SchoolHandler) Update(c *gin.Context) {
	var req models.Sekolah
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid: " + err.Error()})
		return
	}

	if err := h.schoolRepo.Update(&req); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal memperbarui informasi sekolah: " + err.Error()})
		return
	}

	userID := c.GetInt("user_id")
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "UPDATE_INFORMASI_SEKOLAH", TabelTerkait: "informasi_sekolah"})

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Informasi sekolah berhasil diperbarui"})
}

func (h *SchoolHandler) UploadLogo(c *gin.Context) {
	filename, err := saveSchoolFile(c, "logo", h.cfg.UploadDir, "logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Gagal upload logo: " + err.Error()})
		return
	}

	if err := h.schoolRepo.UpdateLogo(filename); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal menyimpan logo: " + err.Error()})
		return
	}

	userID := c.GetInt("user_id")
	h.actRepo.Create(&models.ActivityLog{IDUser: userID, Aksi: "UPDATE_LOGO_SEKOLAH", TabelTerkait: "informasi_sekolah"})

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Logo sekolah berhasil diupdate", Data: gin.H{"logo_sekolah": filename}})
}

func saveSchoolFile(c *gin.Context, fieldName, uploadDir, prefix string) (string, error) {
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
