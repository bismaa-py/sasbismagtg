package repository

import (
	"database/sql"
	"disposisi-surat/internal/models"
)

type SchoolRepository struct {
	db *sql.DB
}

func NewSchoolRepository(db *sql.DB) *SchoolRepository {
	return &SchoolRepository{db: db}
}

func (r *SchoolRepository) Get() (*models.Sekolah, error) {
	s := &models.Sekolah{}
	err := r.db.QueryRow("SELECT id, nama_sekolah, logo_sekolah, email_sekolah, alamat_sekolah, telp_sekolah FROM informasi_sekolah WHERE id = 1").
		Scan(&s.ID, &s.NamaSekolah, &s.LogoSekolah, &s.EmailSekolah, &s.AlamatSekolah, &s.TelpSekolah)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *SchoolRepository) Update(s *models.Sekolah) error {
	_, err := r.db.Exec("UPDATE informasi_sekolah SET nama_sekolah = $1, email_sekolah = $2, alamat_sekolah = $3, telp_sekolah = $4 WHERE id = 1",
		s.NamaSekolah, s.EmailSekolah, s.AlamatSekolah, s.TelpSekolah)
	return err
}

func (r *SchoolRepository) UpdateLogo(logo string) error {
	_, err := r.db.Exec("UPDATE informasi_sekolah SET logo_sekolah = $1 WHERE id = 1", logo)
	return err
}
