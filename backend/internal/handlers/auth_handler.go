package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/smtp"
	"time"

	"disposisi-surat/internal/config"
	"disposisi-surat/internal/middleware"
	"disposisi-surat/internal/models"
	"disposisi-surat/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg      *config.Config
	userRepo *repository.UserRepository
	otpRepo  *repository.OTPRepository
	actRepo  *repository.ActivityLogRepository
}

func NewAuthHandler(cfg *config.Config, ur *repository.UserRepository, or *repository.OTPRepository, ar *repository.ActivityLogRepository) *AuthHandler {
	return &AuthHandler{cfg: cfg, userRepo: ur, otpRepo: or, actRepo: ar}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid: " + err.Error()})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		fmt.Printf("⚠️ Login gagal: email '%s' tidak ditemukan di database\n", req.Email)
		c.JSON(http.StatusUnauthorized, models.APIResponse{Success: false, Message: "Email atau password salah"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		fmt.Printf("⚠️ Login gagal: password salah untuk email '%s' (hash length: %d)\n", req.Email, len(user.Password))
		c.JSON(http.StatusUnauthorized, models.APIResponse{Success: false, Message: "Email atau password salah"})
		return
	}

	token, err := h.generateToken(user, h.cfg.JWTExpiryHours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal membuat token"})
		return
	}

	refreshToken, err := h.generateToken(user, h.cfg.JWTRefreshExpiryHrs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal membuat refresh token"})
		return
	}

	h.actRepo.Create(&models.ActivityLog{IDUser: user.ID, Aksi: "LOGIN", TabelTerkait: "users"})

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Login berhasil",
		Data: models.LoginResponse{
			Token:        token,
			RefreshToken: refreshToken,
			User:         *user,
		},
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	userID := c.GetInt("user_id")
	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.APIResponse{Success: false, Message: "User tidak ditemukan"})
		return
	}
	token, _ := h.generateToken(user, h.cfg.JWTExpiryHours)
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: gin.H{"token": token}})
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Email tidak valid"})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Jika email terdaftar, OTP telah dikirim"})
		return
	}

	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	otp := &models.OTP{IDUser: user.ID, KodeOTP: code, ExpiresAt: time.Now().Add(5 * time.Minute)}
	if err := h.otpRepo.Create(otp); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal membuat OTP"})
		return
	}

	// Send OTP via SMTP (Gmail) or Resend
	if h.cfg.SMTPEmail != "" && h.cfg.SMTPPassword != "" {
		if err := h.sendOTPViaSMTP(req.Email, user.Nama, code); err != nil {
			fmt.Printf("⚠️ Gagal kirim email via SMTP: %v\n", err)
			fmt.Printf("📱 OTP untuk %s: %s\n", req.Email, code)
		} else {
			fmt.Printf("✅ OTP berhasil dikirim ke %s via SMTP\n", req.Email)
		}
	} else if h.cfg.ResendAPIKey != "" {
		if err := h.sendOTPViaResend(req.Email, user.Nama, code); err != nil {
			fmt.Printf("⚠️ Gagal kirim email via Resend: %v\n", err)
			fmt.Printf("📱 OTP untuk %s: %s\n", req.Email, code)
		} else {
			fmt.Printf("✅ OTP berhasil dikirim ke %s via Resend\n", req.Email)
		}
	} else {
		fmt.Printf("📱 OTP untuk %s: %s\n", req.Email, code)
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OTP telah dikirim ke email Anda"})
}

func (h *AuthHandler) ResendOTP(c *gin.Context) {
	h.ForgotPassword(c)
}

func (h *AuthHandler) SendOTPForPasswordChange(c *gin.Context) {
	userID := c.GetInt("user_id")
	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "User tidak ditemukan"})
		return
	}

	code := fmt.Sprintf("%06d", rand.Intn(1000000))
	otp := &models.OTP{IDUser: user.ID, KodeOTP: code, ExpiresAt: time.Now().Add(5 * time.Minute)}
	if err := h.otpRepo.Create(otp); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal membuat OTP"})
		return
	}

	// Send OTP via SMTP (Gmail) or Resend
	if h.cfg.SMTPEmail != "" && h.cfg.SMTPPassword != "" {
		if err := h.sendOTPViaSMTP(user.Email, user.Nama, code); err != nil {
			fmt.Printf("⚠️ Gagal kirim email via SMTP: %v\n", err)
			fmt.Printf("📱 OTP ganti password untuk %s: %s\n", user.Email, code)
		} else {
			fmt.Printf("✅ OTP ganti password dikirim ke %s via SMTP\n", user.Email)
		}
	} else if h.cfg.ResendAPIKey != "" {
		if err := h.sendOTPViaResend(user.Email, user.Nama, code); err != nil {
			fmt.Printf("⚠️ Gagal kirim email via Resend: %v\n", err)
			fmt.Printf("📱 OTP ganti password untuk %s: %s\n", user.Email, code)
		} else {
			fmt.Printf("✅ OTP ganti password dikirim ke %s via Resend\n", user.Email)
		}
	} else {
		fmt.Printf("📱 OTP ganti password untuk %s: %s\n", user.Email, code)
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OTP telah dikirim ke email Anda"})
}

func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req models.VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid"})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Email tidak ditemukan"})
		return
	}

	_, err = h.otpRepo.FindValid(user.ID, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "OTP tidak valid atau sudah kadaluarsa"})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "OTP valid"})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Data tidak valid"})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "User tidak ditemukan"})
		return
	}

	otp, err := h.otpRepo.FindValid(user.ID, req.Code)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "OTP tidak valid"})
		return
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err := h.userRepo.UpdatePassword(user.ID, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal reset password"})
		return
	}

	h.otpRepo.MarkUsed(otp.ID)
	h.actRepo.Create(&models.ActivityLog{IDUser: user.ID, Aksi: "RESET_PASSWORD", TabelTerkait: "users"})

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Password berhasil direset"})
}

func (h *AuthHandler) generateToken(user *models.User, expiryHours int) (string, error) {
	claims := middleware.Claims{
		UserID:   user.ID,
		Email:    user.Email,
		Role:     user.Role,
		Username: user.Nama,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expiryHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.cfg.JWTSecret))
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.GetInt("user_id")
	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "User tidak ditemukan"})
			return
		}
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Gagal mengambil data user"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: user})
}

// sendOTPViaResend sends OTP email using Resend API
func (h *AuthHandler) sendOTPViaResend(toEmail, toName, code string) error {
	htmlContent := fmt.Sprintf(`<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
		<div style="text-align:center;margin-bottom:20px;">
			<h2 style="color:#374151;margin-bottom:4px;">E-Disposisi Surat</h2>
			<p style="color:#64748b;font-size:13px;">SMKN 2 Singosari Malang</p>
		</div>
		<h3 style="color:#1e293b;margin-bottom:16px;">Kode OTP Anda</h3>
		<p style="color:#475569;margin-bottom:24px;">Halo <strong>%s</strong>, gunakan kode berikut untuk verifikasi. Kode ini berlaku selama 5 menit.</p>
		<div style="background:#374151;color:white;font-size:32px;font-weight:700;letter-spacing:8px;padding:20px;text-align:center;border-radius:8px;margin-bottom:24px;">%s</div>
		<p style="color:#94a3b8;font-size:13px;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
	</div>`, toName, code)

	payload := map[string]interface{}{
		"from":    fmt.Sprintf("%s <%s>", h.cfg.ResendFromName, h.cfg.ResendFromEmail),
		"to":      []string{toEmail},
		"subject": "Kode OTP - E-Disposisi SMKN 2 Singosari",
		"html":    htmlContent,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+h.cfg.ResendAPIKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("resend returned status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

// sendOTPViaSMTP sends OTP email using SMTP (e.g. Gmail)
func (h *AuthHandler) sendOTPViaSMTP(toEmail, toName, code string) error {
	host := h.cfg.SMTPHost
	port := h.cfg.SMTPPort
	email := h.cfg.SMTPEmail
	password := h.cfg.SMTPPassword
	fromName := h.cfg.SMTPFromName

	// Receiver address
	to := []string{toEmail}

	// Message headers and HTML content
	subject := "Subject: Kode OTP - E-Disposisi SMKN 2 Singosari\r\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"

	htmlContent := fmt.Sprintf(`<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
		<div style="text-align:center;margin-bottom:20px;">
			<h2 style="color:#374151;margin-bottom:4px;">E-Disposisi Surat</h2>
			<p style="color:#64748b;font-size:13px;">SMKN 2 Singosari Malang</p>
		</div>
		<h3 style="color:#1e293b;margin-bottom:16px;">Kode OTP Anda</h3>
		<p style="color:#475569;margin-bottom:24px;">Halo <strong>%s</strong>, gunakan kode berikut untuk verifikasi. Kode ini berlaku selama 5 menit.</p>
		<div style="background:#374151;color:white;font-size:32px;font-weight:700;letter-spacing:8px;padding:20px;text-align:center;border-radius:8px;margin-bottom:24px;">%s</div>
		<p style="color:#94a3b8;font-size:13px;">Jika Anda tidak meminta kode ini, abaikan email ini.</p>
	</div>`, toName, code)

	fromHeader := fmt.Sprintf("From: %s <%s>\r\n", fromName, email)
	toHeader := fmt.Sprintf("To: %s\r\n", toEmail)
	msg := []byte(fromHeader + toHeader + subject + mime + htmlContent)

	// Auth setup
	auth := smtp.PlainAuth("", email, password, host)

	// Sending email
	addr := fmt.Sprintf("%s:%s", host, port)
	err := smtp.SendMail(addr, auth, email, to, msg)
	if err != nil {
		return err
	}
	return nil
}
