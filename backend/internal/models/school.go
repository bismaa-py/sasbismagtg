package models

type Sekolah struct {
	ID            int    `json:"id" db:"id"`
	NamaSekolah   string `json:"nama_sekolah" db:"nama_sekolah" binding:"required"`
	LogoSekolah   string `json:"logo_sekolah" db:"logo_sekolah"`
	EmailSekolah  string `json:"email_sekolah" db:"email_sekolah"`
	AlamatSekolah string `json:"alamat_sekolah" db:"alamat_sekolah"`
	TelpSekolah   string `json:"telp_sekolah" db:"telp_sekolah"`
}
