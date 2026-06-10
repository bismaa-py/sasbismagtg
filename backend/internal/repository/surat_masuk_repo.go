package repository

import (
	"database/sql"
	"disposisi-surat/internal/models"
	"fmt"
)

type SuratMasukRepository struct {
	db *sql.DB
}

func NewSuratMasukRepository(db *sql.DB) *SuratMasukRepository {
	return &SuratMasukRepository{db: db}
}

func (r *SuratMasukRepository) Create(s *models.SuratMasuk) error {
	return r.db.QueryRow(
		`INSERT INTO surat_masuk (no_surat, perihal_surat, asal_surat, tanggal_surat, file_pdf)
		 VALUES ($1,$2,$3,$4,$5) RETURNING id_surat_masuk, created_at, updated_at`,
		s.NoSurat, s.PerihalSurat, s.AsalSurat, s.TanggalSurat, s.FilePDF,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func scanSuratMasuk(row interface{ Scan(...interface{}) error }) (*models.SuratMasuk, error) {
	s := &models.SuratMasuk{}
	var userVerif sql.NullInt64
	var tglVerif sql.NullTime
	var idDispAktif sql.NullInt64
	var catatanVerif, tglDiterima, statusAlur sql.NullString
	err := row.Scan(
		&s.ID, &s.NoSurat, &s.PerihalSurat, &s.AsalSurat, &s.TanggalSurat,
		&s.FilePDF, &tglDiterima, &s.StatusVerifikasi, &userVerif, &tglVerif,
		&catatanVerif, &s.CreatedAt, &idDispAktif, &statusAlur, &s.UpdatedAt,
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
	if idDispAktif.Valid {
		v := int(idDispAktif.Int64)
		s.IDDisposisiAktif = &v
	}
	if catatanVerif.Valid {
		s.CatatanVerifikasi = catatanVerif.String
	}
	if tglDiterima.Valid {
		s.TanggalDiterima = tglDiterima.String
	}
	if statusAlur.Valid {
		s.StatusAlur = statusAlur.String
	}
	return s, nil
}

const smSelectQuery = `SELECT id_surat_masuk, no_surat, perihal_surat, asal_surat, tanggal_surat,
	COALESCE(file_pdf,''), tanggal_diterima, COALESCE(status_verifikasi,'menunggu'),
	user_verifikasi, tanggal_verifikasi, catatan_verifikasi,
	created_at, id_disposisi_aktif, status_alur, updated_at
	FROM surat_masuk`

func (r *SuratMasukRepository) FindByID(id int) (*models.SuratMasuk, error) {
	return scanSuratMasuk(r.db.QueryRow(smSelectQuery+" WHERE id_surat_masuk = $1", id))
}

func (r *SuratMasukRepository) FindAll() ([]models.SuratMasuk, error) {
	rows, err := r.db.Query(smSelectQuery + " ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

func (r *SuratMasukRepository) FindByStatus(status string) ([]models.SuratMasuk, error) {
	rows, err := r.db.Query(smSelectQuery+" WHERE status_verifikasi = $1 ORDER BY created_at DESC", status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindActive: menunggu OR disetujui-but-not-yet-forwarded. Excludes ditolak and already forwarded.
func (r *SuratMasukRepository) FindActive() ([]models.SuratMasuk, error) {
	rows, err := r.db.Query(smSelectQuery + ` WHERE 
		status_verifikasi = 'menunggu' 
		OR (status_verifikasi = 'disetujui' AND (status_alur IS NULL OR status_alur = 'disposisi_kepsek'))
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindHistory: only surat that are fully processed - ditolak OR diteruskan/selesai
func (r *SuratMasukRepository) FindHistory(statusFilter string) ([]models.SuratMasuk, error) {
	var query string
	if statusFilter == "ditolak" {
		query = smSelectQuery + " WHERE status_verifikasi = 'ditolak'"
	} else if statusFilter == "disetujui" {
		query = smSelectQuery + " WHERE status_verifikasi = 'disetujui' AND status_alur IN ('diteruskan','diteruskan_waka','selesai')"
	} else {
		// Default: show ditolak + diteruskan/diteruskan_waka/selesai (truly completed)
		query = smSelectQuery + " WHERE status_verifikasi = 'ditolak' OR (status_verifikasi = 'disetujui' AND status_alur IN ('diteruskan','diteruskan_waka','selesai'))"
	}
	query += " ORDER BY created_at DESC"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// Feature 8: Find surat that were forwarded to a specific user
func (r *SuratMasukRepository) FindByRecipientUser(userID int) ([]models.SuratMasuk, error) {
	query := `SELECT sm.id_surat_masuk, sm.no_surat, sm.perihal_surat, sm.asal_surat, sm.tanggal_surat,
		COALESCE(sm.file_pdf,''), sm.tanggal_diterima, COALESCE(sm.status_verifikasi,'menunggu'),
		sm.user_verifikasi, sm.tanggal_verifikasi, sm.catatan_verifikasi,
		sm.created_at, sm.id_disposisi_aktif, sm.status_alur, sm.updated_at
		FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1
		ORDER BY sm.created_at DESC`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

func (r *SuratMasukRepository) Update(s *models.SuratMasuk) error {
	_, err := r.db.Exec(
		`UPDATE surat_masuk SET no_surat=$1, perihal_surat=$2, asal_surat=$3, tanggal_surat=$4 WHERE id_surat_masuk=$5`,
		s.NoSurat, s.PerihalSurat, s.AsalSurat, s.TanggalSurat, s.ID,
	)
	return err
}

func (r *SuratMasukRepository) UpdateFilePDF(id int, path string) error {
	_, err := r.db.Exec("UPDATE surat_masuk SET file_pdf=$1 WHERE id_surat_masuk=$2", path, id)
	return err
}

func (r *SuratMasukRepository) UpdateStatus(id int, status, catatan string, userVerifikasi int) error {
	_, err := r.db.Exec(
		"UPDATE surat_masuk SET status_verifikasi=$1, catatan_verifikasi=$2, user_verifikasi=$3, tanggal_verifikasi=NOW() WHERE id_surat_masuk=$4",
		status, catatan, userVerifikasi, id,
	)
	return err
}

func (r *SuratMasukRepository) UpdateStatusAlur(id int, statusAlur string) error {
	_, err := r.db.Exec("UPDATE surat_masuk SET status_alur=$1 WHERE id_surat_masuk=$2", statusAlur, id)
	return err
}

// Feature 23: Delete surat (only if status menunggu)
func (r *SuratMasukRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM surat_masuk WHERE id_surat_masuk=$1 AND status_verifikasi='menunggu'", id)
	return err
}

func (r *SuratMasukRepository) CountByStatus(status string) (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM surat_masuk WHERE status_verifikasi = $1", status).Scan(&count)
	return count, err
}

func (r *SuratMasukRepository) CountAll() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM surat_masuk").Scan(&count)
	return count, err
}

// Feature 2: Count history (disetujui + ditolak)
func (r *SuratMasukRepository) CountHistory() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM surat_masuk WHERE status_verifikasi IN ('disetujui', 'ditolak')").Scan(&count)
	return count, err
}

// CountActive: count active surat masuk for admin/pegawai (menunggu OR disetujui but not yet forwarded)
func (r *SuratMasukRepository) CountActive() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM surat_masuk WHERE 
		status_verifikasi = 'menunggu' 
		OR (status_verifikasi = 'disetujui' AND (status_alur IS NULL OR status_alur = 'disposisi_kepsek'))`).Scan(&count)
	return count, err
}

// CountHistoryForAdmin: count history for admin/pegawai (ditolak OR disetujui and forwarded)
func (r *SuratMasukRepository) CountHistoryForAdmin() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM surat_masuk WHERE 
		status_verifikasi = 'ditolak' 
		OR (status_verifikasi = 'disetujui' AND status_alur IN ('diteruskan','diteruskan_waka','selesai'))`).Scan(&count)
	return count, err
}

// Count menunggu for both surat masuk and surat keluar (for dashboard)
func (r *SuratMasukRepository) CountMenunggu() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM surat_masuk WHERE status_verifikasi = 'menunggu'").Scan(&count)
	return count, err
}

// FindByStatusWithDateRange: Find surat masuk by status with optional date range
func (r *SuratMasukRepository) FindByStatusWithDateRange(status, dateFrom, dateTo string) ([]models.SuratMasuk, error) {
	query := smSelectQuery + " WHERE status_verifikasi = $1"
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
	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindActiveWithDateRange: Find active surat masuk with optional date range
func (r *SuratMasukRepository) FindActiveWithDateRange(dateFrom, dateTo string) ([]models.SuratMasuk, error) {
	query := smSelectQuery + ` WHERE 
		status_verifikasi = 'menunggu' 
		OR (status_verifikasi = 'disetujui' AND (status_alur IS NULL OR status_alur = 'disposisi_kepsek'))`
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
	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindHistoryWithDateRange: Find surat masuk history with optional date range
func (r *SuratMasukRepository) FindHistoryWithDateRange(statusFilter, dateFrom, dateTo string) ([]models.SuratMasuk, error) {
	var query string
	if statusFilter == "ditolak" {
		query = smSelectQuery + " WHERE status_verifikasi = 'ditolak'"
	} else if statusFilter == "disetujui" {
		query = smSelectQuery + " WHERE status_verifikasi = 'disetujui' AND status_alur IN ('diteruskan','diteruskan_waka','selesai')"
	} else {
		query = smSelectQuery + " WHERE status_verifikasi = 'ditolak' OR (status_verifikasi = 'disetujui' AND status_alur IN ('diteruskan','diteruskan_waka','selesai'))"
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
	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindHistoryKepsekWithDateRange: Kepsek sees any surat that has been reviewed (disetujui/ditolak)
// Langsung masuk riwayat begitu kepsek ACC/tolak, tidak perlu menunggu admin meneruskan
func (r *SuratMasukRepository) FindHistoryKepsekWithDateRange(statusFilter, dateFrom, dateTo string) ([]models.SuratMasuk, error) {
	var query string
	if statusFilter == "ditolak" {
		query = smSelectQuery + " WHERE status_verifikasi = 'ditolak'"
	} else if statusFilter == "disetujui" {
		query = smSelectQuery + " WHERE status_verifikasi = 'disetujui'"
	} else {
		// Default: semua surat yang sudah di-review (disetujui atau ditolak)
		query = smSelectQuery + " WHERE status_verifikasi IN ('disetujui', 'ditolak')"
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
	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindByRecipientUserWithDateRange: Find surat forwarded to a specific user with optional date range
// Also includes disposisi_id and status so frontend can show "Terima Surat" button
// jabatanID: 0 = all jabatan (semua), >0 = filter by specific jabatan
func (r *SuratMasukRepository) FindByRecipientUserWithDateRange(userID int, dateFrom, dateTo string, jabatanID int) ([]models.SuratMasuk, error) {
	query := `SELECT sm.id_surat_masuk, sm.no_surat, sm.perihal_surat, sm.asal_surat, sm.tanggal_surat,
		COALESCE(sm.file_pdf,''), sm.tanggal_diterima, COALESCE(sm.status_verifikasi,'menunggu'),
		sm.user_verifikasi, sm.tanggal_verifikasi, sm.catatan_verifikasi,
		sm.created_at, sm.id_disposisi_aktif, sm.status_alur, sm.updated_at,
		d.id_disposisi, COALESCE(d.status_disposisi,'belum_dibaca')
		FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1 AND d.status_disposisi != 'dibaca'`
	args := []interface{}{userID}
	argIdx := 2

	// Filter by specific jabatan if provided
	if jabatanID > 0 {
		query += fmt.Sprintf(" AND d.id_jabatan_penerima = $%d", argIdx)
		args = append(args, jabatanID)
		argIdx++
	}

	if dateFrom != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
		if dateTo != "" {
			query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
			args = append(args, dateTo)
			argIdx++
		}
	} else if dateTo != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}
	query += " ORDER BY sm.created_at DESC"
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratMasuk
	for rows.Next() {
		s := &models.SuratMasuk{}
		var userVerif sql.NullInt64
		var tglVerif sql.NullTime
		var idDispAktif sql.NullInt64
		var catatanVerif, tglDiterima, statusAlur sql.NullString
		var dispID int
		var dispStatus string
		err := rows.Scan(
			&s.ID, &s.NoSurat, &s.PerihalSurat, &s.AsalSurat, &s.TanggalSurat,
			&s.FilePDF, &tglDiterima, &s.StatusVerifikasi, &userVerif, &tglVerif,
			&catatanVerif, &s.CreatedAt, &idDispAktif, &statusAlur, &s.UpdatedAt,
			&dispID, &dispStatus,
		)
		if err != nil {
			return nil, err
		}
		if userVerif.Valid { v := int(userVerif.Int64); s.UserVerifikasi = &v }
		if tglVerif.Valid { s.TanggalVerifikasi = &tglVerif.Time }
		if idDispAktif.Valid { v := int(idDispAktif.Int64); s.IDDisposisiAktif = &v }
		if catatanVerif.Valid { s.CatatanVerifikasi = catatanVerif.String }
		if tglDiterima.Valid { s.TanggalDiterima = tglDiterima.String }
		if statusAlur.Valid { s.StatusAlur = statusAlur.String }
		s.DisposisiID = &dispID
		s.DisposisiStatus = dispStatus
		list = append(list, *s)
	}
	return list, nil
}

// FindByRecipientUserConfirmedWithDateRange: Find surat that user has confirmed/received (for history)
func (r *SuratMasukRepository) FindByRecipientUserConfirmedWithDateRange(userID int, dateFrom, dateTo string, jabatanID int) ([]models.SuratMasuk, error) {
	query := `SELECT sm.id_surat_masuk, sm.no_surat, sm.perihal_surat, sm.asal_surat, sm.tanggal_surat,
		COALESCE(sm.file_pdf,''), sm.tanggal_diterima, COALESCE(sm.status_verifikasi,'menunggu'),
		sm.user_verifikasi, sm.tanggal_verifikasi, sm.catatan_verifikasi,
		sm.created_at, sm.id_disposisi_aktif, sm.status_alur, sm.updated_at
		FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1 AND d.status_disposisi = 'dibaca'`
	args := []interface{}{userID}
	argIdx := 2
	if jabatanID > 0 {
		query += fmt.Sprintf(" AND d.id_jabatan_penerima = $%d", argIdx)
		args = append(args, jabatanID)
		argIdx++
	}
	if dateFrom != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
		if dateTo != "" {
			query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
			args = append(args, dateTo)
			argIdx++
		}
	} else if dateTo != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}
	query += " ORDER BY sm.created_at DESC"
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// FindByRecipientUserAll: Find ALL surat forwarded to a specific user (both confirmed and unconfirmed)
func (r *SuratMasukRepository) FindByRecipientUserAll(userID int) ([]models.SuratMasuk, error) {
	query := `SELECT sm.id_surat_masuk, sm.no_surat, sm.perihal_surat, sm.asal_surat, sm.tanggal_surat,
		COALESCE(sm.file_pdf,''), sm.tanggal_diterima, COALESCE(sm.status_verifikasi,'menunggu'),
		sm.user_verifikasi, sm.tanggal_verifikasi, sm.catatan_verifikasi,
		sm.created_at, sm.id_disposisi_aktif, sm.status_alur, sm.updated_at
		FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1
		ORDER BY sm.created_at DESC`
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// CountByRecipientUserUnconfirmed: Count unconfirmed surat for a user (for dashboard stat)
func (r *SuratMasukRepository) CountByRecipientUserUnconfirmed(userID int) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM surat_masuk sm 
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk 
		WHERE d.id_penerima = $1 AND d.status_disposisi != 'dibaca'`, userID).Scan(&count)
	return count, err
}

// CountByRecipientUserConfirmed: Count confirmed/received surat for a user (for dashboard history stat)
func (r *SuratMasukRepository) CountByRecipientUserConfirmed(userID int) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM surat_masuk sm 
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk 
		WHERE d.id_penerima = $1 AND d.status_disposisi = 'dibaca'`, userID).Scan(&count)
	return count, err
}

// FindByWakaRecipient: Surat yang diteruskan ke waka (belum diteruskan ke user)
func (r *SuratMasukRepository) FindByWakaRecipient(wakaUserID int, dateFrom, dateTo string) ([]models.SuratMasuk, error) {
	query := `SELECT sm.id_surat_masuk, sm.no_surat, sm.perihal_surat, sm.asal_surat, sm.tanggal_surat,
		COALESCE(sm.file_pdf,''), sm.tanggal_diterima, COALESCE(sm.status_verifikasi,'menunggu'),
		sm.user_verifikasi, sm.tanggal_verifikasi, sm.catatan_verifikasi,
		sm.created_at, sm.id_disposisi_aktif, sm.status_alur, sm.updated_at,
		d.id_disposisi, COALESCE(d.status_disposisi,'belum_dibaca')
		FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1 AND d.id_waka IS NULL AND d.status_disposisi != 'dibaca'`
	args := []interface{}{wakaUserID}
	argIdx := 2
	if dateFrom != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
		if dateTo != "" {
			query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
			args = append(args, dateTo)
			argIdx++
		}
	} else if dateTo != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}
	query += " ORDER BY sm.created_at DESC"
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratMasuk
	for rows.Next() {
		s := &models.SuratMasuk{}
		var userVerif sql.NullInt64
		var tglVerif sql.NullTime
		var idDispAktif sql.NullInt64
		var catatanVerif, tglDiterima, statusAlur sql.NullString
		var dispID int
		var dispStatus string
		err := rows.Scan(
			&s.ID, &s.NoSurat, &s.PerihalSurat, &s.AsalSurat, &s.TanggalSurat,
			&s.FilePDF, &tglDiterima, &s.StatusVerifikasi, &userVerif, &tglVerif,
			&catatanVerif, &s.CreatedAt, &idDispAktif, &statusAlur, &s.UpdatedAt,
			&dispID, &dispStatus,
		)
		if err != nil {
			return nil, err
		}
		if userVerif.Valid { v := int(userVerif.Int64); s.UserVerifikasi = &v }
		if tglVerif.Valid { s.TanggalVerifikasi = &tglVerif.Time }
		if idDispAktif.Valid { v := int(idDispAktif.Int64); s.IDDisposisiAktif = &v }
		if catatanVerif.Valid { s.CatatanVerifikasi = catatanVerif.String }
		if tglDiterima.Valid { s.TanggalDiterima = tglDiterima.String }
		if statusAlur.Valid { s.StatusAlur = statusAlur.String }
		s.DisposisiID = &dispID
		s.DisposisiStatus = dispStatus
		list = append(list, *s)
	}
	return list, nil
}

// FindByWakaRecipientHistory: Surat yang sudah diteruskan oleh waka (disposisi waka sudah 'dibaca')
func (r *SuratMasukRepository) FindByWakaRecipientHistory(wakaUserID int, dateFrom, dateTo string) ([]models.SuratMasuk, error) {
	query := `SELECT sm.id_surat_masuk, sm.no_surat, sm.perihal_surat, sm.asal_surat, sm.tanggal_surat,
		COALESCE(sm.file_pdf,''), sm.tanggal_diterima, COALESCE(sm.status_verifikasi,'menunggu'),
		sm.user_verifikasi, sm.tanggal_verifikasi, sm.catatan_verifikasi,
		sm.created_at, sm.id_disposisi_aktif, sm.status_alur, sm.updated_at
		FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1 AND d.id_waka IS NULL AND d.status_disposisi = 'dibaca'`
	args := []interface{}{wakaUserID}
	argIdx := 2
	if dateFrom != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
		if dateTo != "" {
			query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
			args = append(args, dateTo)
			argIdx++
		}
	} else if dateTo != "" {
		query += fmt.Sprintf(" AND sm.tanggal_surat <= $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}
	query += " ORDER BY sm.created_at DESC"
	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SuratMasuk
	for rows.Next() {
		s, err := scanSuratMasuk(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, nil
}

// CountByWakaUnconfirmed: Count surat forwarded to waka but not yet forwarded to user
func (r *SuratMasukRepository) CountByWakaUnconfirmed(wakaUserID int) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1 AND d.id_waka IS NULL AND d.status_disposisi != 'dibaca'`, wakaUserID).Scan(&count)
	return count, err
}

// CountByWakaConfirmed: Count surat already forwarded by waka to user (history)
func (r *SuratMasukRepository) CountByWakaConfirmed(wakaUserID int) (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM surat_masuk sm
		INNER JOIN disposisi d ON sm.id_surat_masuk = d.id_surat_masuk
		WHERE d.id_penerima = $1 AND d.id_waka IS NULL AND d.status_disposisi = 'dibaca'`, wakaUserID).Scan(&count)
	return count, err
}
