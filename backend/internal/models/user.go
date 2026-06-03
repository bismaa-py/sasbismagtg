package models

import "time"

// User sesuai tabel users: id_user, nama, email, password, created_at, foto_profil
// Role didapat dari JOIN ke user_jabatan + jabatan (level_akses)
type User struct {
	ID          int       `json:"id"`
	Nama        string    `json:"nama"`
	Email       string    `json:"email"`
	Password    string    `json:"-"`
	Role        string    `json:"role,omitempty"`          // dari jabatan.level_akses via user_jabatan
	NamaJabatan string    `json:"nama_jabatan,omitempty"`  // dari jabatan.nama_jabatan
	FotoProfil  string    `json:"foto_profil,omitempty"`   // path ke foto profil
	CreatedAt   time.Time `json:"created_at"`
	// Multiple jabatan support
	SemuaJabatan []JabatanInfo `json:"semua_jabatan,omitempty"`
}

// JabatanInfo for multi-jabatan support (Feature 19)
type JabatanInfo struct {
	IDJabatan   int    `json:"id_jabatan"`
	NamaJabatan string `json:"nama_jabatan"`
	LevelAkses  string `json:"level_akses"`
	IsPrimary   bool   `json:"is_primary"`
}

type CreateUserRequest struct {
	Nama      string `json:"nama" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=8"`
	IDJabatan []int  `json:"id_jabatan" binding:"required"` // Changed to array for multi-jabatan
}

type UpdateUserRequest struct {
	Nama      string `json:"nama"`
	Email     string `json:"email" binding:"omitempty,email"`
	Password  string `json:"password" binding:"omitempty,min=8"`
	IDJabatan []int  `json:"id_jabatan"` // Changed to array for multi-jabatan
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}

type ChangePasswordRequest struct {
	OTPCode         string `json:"otp_code" binding:"required,len=6"` // Feature 20: OTP sebelum ganti password
	NewPassword     string `json:"new_password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type VerifyOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6"`
}

type ResetPasswordRequest struct {
	Email           string `json:"email" binding:"required,email"`
	Code            string `json:"code" binding:"required,len=6"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword"`
}

// Feature 18: Profil tidak bisa ganti nama, akun, jabatan - hanya foto
type UpdateProfileRequest struct {
	// Nama field removed - users/kepsek cannot change name
}

// SendOTPForPasswordRequest - Feature 20: kirim OTP ke user yang login sebelum ganti password
type SendOTPForPasswordRequest struct {
	// No fields needed, user ID from JWT
}
