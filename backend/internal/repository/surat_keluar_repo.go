package repository

import (
	"database/sql"
	"disposisi-surat/internal/models"
	"strconv"
)

type SuratKeluarRepository struct {
	db *sql.DB
}

func NewSuratKeluarRepository(db *sql.DB) *SuratKeluarRepository {
	return &SuratKeluarRepository{db: db}
}

func scanSuratKeluar(row interface{ Scan(...interface{}) error }) (*models.SuratKeluar, error) {
	s := &models.SuratKeluar{}
	var userVerif sql.NullInt64
	var tglVerif sql.NullTime
	var catatan, tujuan, catatanVerif, statusAlur sql.NullString
	err := row.Scan(
		&s.ID, &s.KodeSurat, &s.NoSurat, &s.Perihal, &catatan,
		&s.TanggalSurat, &s.FilePDF, &s.StatusVerifikasi,
		&userVerif, &tglVerif, &tujuan, &catatanVerif,
		&s.CreatedAt, &s.UpdatedAt, &statusAlur,
	)
	if err != nil {
		return nil, err
	}
	if userVerif.Valid {
		v := int(userVerif.Int64)
		s.UserVerifikasi = &v
	}
	if tglVerif.Valid {
		s.TanggalVerifikasi = &tglVerif.Time
	}
	if catatan.Valid {
		s.Catatan = catatan.String
	}
	if tujuan.Valid {
		s.Tujuan = tujuan.String
	}
	if catatanVerif.Valid {
		s.CatatanVerifikasi = catatanVerif.String
	}
	if statusAlur.Valid {
		s.StatusAlur = statusAlur.String
	}
	return s, nil
}

const skSelectQuery = `SELECT id_surat_keluar, kode_surat, no_surat, perihal, catatan,
	tanggal_surat, COALESCE(file_pdf,''), COALESCE(status_verifikasi,'menunggu'),
	user_verifikasi, tanggal_verifikasi, tujuan, catatan_verifikasi,
	created_at, updated_at, status_alur
	FROM surat_keluar`

func (r *SuratKeluarRepository) Create(s *models.SuratKeluar) error {
	return r.db.QueryRow(
		`INSERT INTO surat_keluar (kode_surat, no_surat, perihal, tanggal_surat, file_pdf, tujuan, catatan)
		 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id_surat_keluar, created_at, updated_at`,
		s.KodeSurat, s.NoSurat, s.Perihal, s.TanggalSurat, s.FilePDF, s.Tujuan, s.Catatan,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *SuratKeluarRepository) FindByID(id int) (*models.SuratKeluar, error) {
	return scanSuratKeluar(r.db.QueryRow(skSelectQuery+" WHERE id_surat_keluar = $1", id))
}

func (r *SuratKeluarRepository) FindAll() ([]models.SuratKeluar, error) {
	rows, err := r.db.Query(skSelectQuery + " ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratKeluar
	for rows.Next() {
		s, err := scanSuratKeluar(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// Feature 6: Find surat keluar by status filter
func (r *SuratKeluarRepository) FindByStatus(status string) ([]models.SuratKeluar, error) {
	rows, err := r.db.Query(skSelectQuery+" WHERE status_verifikasi = $1 ORDER BY created_at DESC", status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratKeluar
	for rows.Next() {
		s, err := scanSuratKeluar(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// Feature 2: Find only active surat keluar (menunggu)
func (r *SuratKeluarRepository) FindActive() ([]models.SuratKeluar, error) {
	rows, err := r.db.Query(skSelectQuery + " WHERE status_verifikasi = 'menunggu' ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratKeluar
	for rows.Next() {
		s, err := scanSuratKeluar(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindHistory: only surat keluar that are fully processed (disetujui or ditolak)
func (r *SuratKeluarRepository) FindHistory(statusFilter string) ([]models.SuratKeluar, error) {
	var query string
	if statusFilter == "ditolak" {
		query = skSelectQuery + " WHERE status_verifikasi = 'ditolak'"
	} else if statusFilter == "disetujui" {
		query = skSelectQuery + " WHERE status_verifikasi = 'disetujui'"
	} else {
		query = skSelectQuery + " WHERE status_verifikasi IN ('disetujui', 'ditolak')"
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratKeluar
	for rows.Next() {
		s, err := scanSuratKeluar(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

func (r *SuratKeluarRepository) Update(s *models.SuratKeluar) error {
	_, err := r.db.Exec(
		`UPDATE surat_keluar SET kode_surat=$1, no_surat=$2, perihal=$3, tanggal_surat=$4, tujuan=$5, catatan=$6 WHERE id_surat_keluar=$7`,
		s.KodeSurat, s.NoSurat, s.Perihal, s.TanggalSurat, s.Tujuan, s.Catatan, s.ID)
	return err
}

func (r *SuratKeluarRepository) UpdateFilePDF(id int, path string) error {
	_, err := r.db.Exec("UPDATE surat_keluar SET file_pdf=$1 WHERE id_surat_keluar=$2", path, id)
	return err
}

func (r *SuratKeluarRepository) UpdateStatus(id int, status, catatan string, userVerifikasi int) error {
	_, err := r.db.Exec(
		"UPDATE surat_keluar SET status_verifikasi=$1, catatan_verifikasi=$2, user_verifikasi=$3, tanggal_verifikasi=NOW() WHERE id_surat_keluar=$4",
		status, catatan, userVerifikasi, id)
	return err
}

// Feature 23: Delete surat keluar (only if status menunggu)
func (r *SuratKeluarRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM surat_keluar WHERE id_surat_keluar=$1 AND status_verifikasi='menunggu'", id)
	return err
}

func (r *SuratKeluarRepository) CountAll() (int, error) {
	var c int
	err := r.db.QueryRow("SELECT COUNT(*) FROM surat_keluar").Scan(&c)
	return c, err
}

func (r *SuratKeluarRepository) CountByStatus(status string) (int, error) {
	var c int
	err := r.db.QueryRow("SELECT COUNT(*) FROM surat_keluar WHERE status_verifikasi=$1", status).Scan(&c)
	return c, err
}

// Feature 2: Count history surat keluar
func (r *SuratKeluarRepository) CountHistory() (int, error) {
	var c int
	err := r.db.QueryRow("SELECT COUNT(*) FROM surat_keluar WHERE status_verifikasi IN ('disetujui', 'ditolak')").Scan(&c)
	return c, err
}

// Date range filter helper - appends date conditions to query
func appendDateRange(query string, hasWhere bool, dateFrom, dateTo string) (string, []interface{}) {
	args := []interface{}{}
	paramIdx := 1
	// Count existing $N params in query
	for i := 0; i < len(query); i++ {
		if query[i] == '$' {
			paramIdx++
		}
	}
	if dateFrom != "" {
		if hasWhere {
			query += " AND"
		} else {
			query += " WHERE"
			hasWhere = true
		}
		query += " tanggal_surat >= $" + itoa(paramIdx)
		args = append(args, dateFrom)
		paramIdx++
	}
	if dateTo != "" {
		if hasWhere {
			query += " AND"
		} else {
			query += " WHERE"
		}
		query += " tanggal_surat <= $" + itoa(paramIdx)
		args = append(args, dateTo)
	}
	return query, args
}

func itoa(n int) string {
	return strconv.Itoa(n)
}

// FindByStatusWithDateRange: Find surat keluar by status with optional date range
func (r *SuratKeluarRepository) FindByStatusWithDateRange(status, dateFrom, dateTo string) ([]models.SuratKeluar, error) {
	query := skSelectQuery + " WHERE status_verifikasi = $1"
	args := []interface{}{status}
	if dateFrom != "" {
		query += " AND tanggal_surat >= $2"
		args = append(args, dateFrom)
		if dateTo != "" {
			query += " AND tanggal_surat <= $3"
			args = append(args, dateTo)
		}
	} else if dateTo != "" {
		query += " AND tanggal_surat <= $2"
		args = append(args, dateTo)
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratKeluar
	for rows.Next() {
		s, err := scanSuratKeluar(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindActiveWithDateRange: Find active surat keluar (menunggu) with optional date range
func (r *SuratKeluarRepository) FindActiveWithDateRange(dateFrom, dateTo string) ([]models.SuratKeluar, error) {
	query := skSelectQuery + " WHERE status_verifikasi = 'menunggu'"
	args := []interface{}{}
	if dateFrom != "" {
		query += " AND tanggal_surat >= $1"
		args = append(args, dateFrom)
		if dateTo != "" {
			query += " AND tanggal_surat <= $2"
			args = append(args, dateTo)
		}
	} else if dateTo != "" {
		query += " AND tanggal_surat <= $1"
		args = append(args, dateTo)
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratKeluar
	for rows.Next() {
		s, err := scanSuratKeluar(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindHistoryWithDateRange: surat keluar history with optional date range
func (r *SuratKeluarRepository) FindHistoryWithDateRange(statusFilter, dateFrom, dateTo string) ([]models.SuratKeluar, error) {
	var query string
	if statusFilter == "ditolak" {
		query = skSelectQuery + " WHERE status_verifikasi = 'ditolak'"
	} else if statusFilter == "disetujui" {
		query = skSelectQuery + " WHERE status_verifikasi = 'disetujui'"
	} else {
		query = skSelectQuery + " WHERE status_verifikasi IN ('disetujui', 'ditolak')"
	}
	args := []interface{}{}
	if dateFrom != "" {
		query += " AND tanggal_surat >= $1"
		args = append(args, dateFrom)
		if dateTo != "" {
			query += " AND tanggal_surat <= $2"
			args = append(args, dateTo)
		}
	} else if dateTo != "" {
		query += " AND tanggal_surat <= $1"
		args = append(args, dateTo)
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratKeluar
	for rows.Next() {
		s, err := scanSuratKeluar(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}
