package models

import "time"

// Tabel: otp (id_otp, id_user, kode_otp, expires_at, created_at, is_used)

type OTP struct {
	ID        int       `json:"id"`
	IDUser    int       `json:"id_user"`
	KodeOTP   string    `json:"-"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
	IsUsed    bool      `json:"is_used"`
}
