package repository

import (
	"database/sql"
	"disposisi-surat/internal/models"
)

type DisposisiRepository struct{ db *sql.DB }

func NewDisposisiRepository(db *sql.DB) *DisposisiRepository {
	return &DisposisiRepository{db: db}
}

func (r *DisposisiRepository) Create(d *models.Disposisi) error {
	return r.db.QueryRow(
		`INSERT INTO disposisi (isi_disposisi, batas_waktu, proses_lanjut, koordinasi_konfirmasi, id_surat_masuk, id_kepsek, id_penerima, id_jabatan_penerima)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_disposisi, tanggal_disposisi`,
		d.IsiDisposisi, d.BatasWaktu, d.ProsesLanjut, d.KoordinasiKonfirmasi,
		d.IDSuratMasuk, d.IDKepsek, d.IDPenerima, d.IDJabatanPenerima,
	).Scan(&d.ID, &d.TanggalDisposisi)
}

func (r *DisposisiRepository) FindByUserID(userID int) ([]models.DisposisiDetail, error) {
	rows, err := r.db.Query(
		`SELECT d.id_disposisi, '' AS sifat, COALESCE(d.isi_disposisi,''), COALESCE(d.batas_waktu,''),
		        COALESCE(d.proses_lanjut,''), COALESCE(d.koordinasi_konfirmasi,''),
		        d.id_surat_masuk, d.id_kepsek, d.id_penerima, d.tanggal_disposisi,
		        COALESCE(d.status_disposisi,'belum_dibaca'), COALESCE(d.status_approval,'menunggu'), d.approval_at,
		        COALESCE(uk.nama,''), COALESCE(up.nama,''),
		        sm.no_surat, sm.perihal_surat, sm.asal_surat, COALESCE(sm.file_pdf,'')
		 FROM disposisi d
		 JOIN surat_masuk sm ON d.id_surat_masuk = sm.id_surat_masuk
		 LEFT JOIN users uk ON d.id_kepsek = uk.id_user
		 LEFT JOIN users up ON d.id_penerima = up.id_user
		 WHERE d.id_penerima = $1 ORDER BY d.tanggal_disposisi DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.DisposisiDetail
	for rows.Next() {
		var dd models.DisposisiDetail
		var approvalAt sql.NullTime
		if err := rows.Scan(
			&dd.ID, &dd.Sifat, &dd.IsiDisposisi, &dd.BatasWaktu,
			&dd.ProsesLanjut, &dd.KoordinasiKonfirmasi,
			&dd.IDSuratMasuk, &dd.IDKepsek, &dd.IDPenerima, &dd.TanggalDisposisi,
			&dd.StatusDisposisi, &dd.StatusApproval, &approvalAt,
			&dd.NamaKepsek, &dd.NamaPenerima,
			&dd.NoSurat, &dd.PerihalSurat, &dd.AsalSurat, &dd.FilePDF,
		); err != nil {
			return nil, err
		}
		if approvalAt.Valid {
			dd.ApprovalAt = &approvalAt.Time
		}
		list = append(list, dd)
	}
	return list, nil
}

func (r *DisposisiRepository) FindBySuratMasukID(suratID int) ([]models.Disposisi, error) {
	rows, err := r.db.Query(
		`SELECT d.id_disposisi, '' AS sifat, COALESCE(d.isi_disposisi,''), COALESCE(d.batas_waktu,''),
		        COALESCE(d.proses_lanjut,''), COALESCE(d.koordinasi_konfirmasi,''),
		        d.id_surat_masuk, d.id_kepsek, d.id_penerima, d.id_jabatan_penerima, d.tanggal_disposisi,
		        COALESCE(d.status_disposisi,'belum_dibaca'), COALESCE(d.status_approval,'menunggu'), d.approval_at,
		        COALESCE(uk.nama,''), COALESCE(up.nama,''), COALESCE(j.nama_jabatan,'')
		 FROM disposisi d
		 LEFT JOIN users uk ON d.id_kepsek = uk.id_user
		 LEFT JOIN users up ON d.id_penerima = up.id_user
		 LEFT JOIN jabatan j ON d.id_jabatan_penerima = j.id_jabatan
		 WHERE d.id_surat_masuk = $1`, suratID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.Disposisi
	for rows.Next() {
		var d models.Disposisi
		var approvalAt sql.NullTime
		var idJabatanPenerima sql.NullInt64
		if err := rows.Scan(
			&d.ID, &d.Sifat, &d.IsiDisposisi, &d.BatasWaktu,
			&d.ProsesLanjut, &d.KoordinasiKonfirmasi,
			&d.IDSuratMasuk, &d.IDKepsek, &d.IDPenerima, &idJabatanPenerima, &d.TanggalDisposisi,
			&d.StatusDisposisi, &d.StatusApproval, &approvalAt,
			&d.NamaKepsek, &d.NamaPenerima, &d.NamaJabatanPenerima,
		); err != nil {
			return nil, err
		}
		if approvalAt.Valid {
			d.ApprovalAt = &approvalAt.Time
		}
		if idJabatanPenerima.Valid {
			v := int(idJabatanPenerima.Int64)
			d.IDJabatanPenerima = &v
		}
		list = append(list, d)
	}
	return list, nil
}

func (r *DisposisiRepository) UpdateStatusDisposisi(id, userID int, status string) error {
	_, err := r.db.Exec(
		"UPDATE disposisi SET status_disposisi=$1 WHERE id_disposisi=$2 AND id_penerima=$3",
		status, id, userID)
	return err
}

func (r *DisposisiRepository) UpdateStatusApproval(id int, status string) error {
	_, err := r.db.Exec(
		"UPDATE disposisi SET status_approval=$1, approval_at=NOW() WHERE id_disposisi=$2",
		status, id)
	return err
}

func (r *DisposisiRepository) CountByUser(userID int) (int, error) {
	var c int
	err := r.db.QueryRow("SELECT COUNT(*) FROM disposisi WHERE id_penerima=$1", userID).Scan(&c)
	return c, err
}

func (r *DisposisiRepository) CountUnconfirmedByUser(userID int) (int, error) {
	var c int
	err := r.db.QueryRow("SELECT COUNT(*) FROM disposisi WHERE id_penerima=$1 AND status_disposisi='belum_dibaca'", userID).Scan(&c)
	return c, err
}
