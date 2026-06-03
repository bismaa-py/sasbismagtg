package repository

import (
	"database/sql"
	"disposisi-surat/internal/models"
)

// ===== NOTIFICATION (tabel: notifikasi) =====

type NotificationRepository struct{ db *sql.DB }

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(n *models.Notification) error {
	return r.db.QueryRow(
		`INSERT INTO notifikasi (id_penerima, id_pengirim, judul, pesan, jenis, id_referensi, tipe_referensi, link_url)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_notifikasi, created_at`,
		n.IDPenerima, n.IDPengirim, n.Judul, n.Pesan, n.Jenis, n.IDReferensi, n.TipeReferensi, n.LinkURL,
	).Scan(&n.ID, &n.CreatedAt)
}

func (r *NotificationRepository) FindByUserID(userID int) ([]models.Notification, error) {
	rows, err := r.db.Query(
		`SELECT id_notifikasi, id_penerima, id_pengirim, judul, COALESCE(pesan,''), COALESCE(jenis,''),
		        id_referensi, is_read, waktu_baca, created_at, COALESCE(link_url,''), COALESCE(tipe_referensi,'')
		 FROM notifikasi WHERE id_penerima=$1 ORDER BY created_at DESC LIMIT 50`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.Notification
	for rows.Next() {
		var n models.Notification
		var idPengirim, idRef sql.NullInt64
		var waktuBaca sql.NullTime
		if err := rows.Scan(
			&n.ID, &n.IDPenerima, &idPengirim, &n.Judul, &n.Pesan, &n.Jenis,
			&idRef, &n.IsRead, &waktuBaca, &n.CreatedAt, &n.LinkURL, &n.TipeReferensi,
		); err != nil {
			return nil, err
		}
		if idPengirim.Valid {
			v := int(idPengirim.Int64)
			n.IDPengirim = &v
		}
		if idRef.Valid {
			v := int(idRef.Int64)
			n.IDReferensi = &v
		}
		if waktuBaca.Valid {
			n.WaktuBaca = &waktuBaca.Time
		}
		list = append(list, n)
	}
	return list, nil
}

func (r *NotificationRepository) MarkAsRead(id, userID int) error {
	_, err := r.db.Exec("UPDATE notifikasi SET is_read=TRUE WHERE id_notifikasi=$1 AND id_penerima=$2", id, userID)
	return err
}

func (r *NotificationRepository) MarkAsReadByReferensi(userID, refID int, tipeRef string) error {
	_, err := r.db.Exec("UPDATE notifikasi SET is_read=TRUE, waktu_baca=NOW() WHERE id_penerima=$1 AND id_referensi=$2 AND tipe_referensi=$3", userID, refID, tipeRef)
	return err
}


func (r *NotificationRepository) MarkAllAsRead(userID int) error {
	_, err := r.db.Exec("UPDATE notifikasi SET is_read=TRUE WHERE id_penerima=$1", userID)
	return err
}

func (r *NotificationRepository) CountUnread(userID int) (int, error) {
	var c int
	err := r.db.QueryRow("SELECT COUNT(*) FROM notifikasi WHERE id_penerima=$1 AND is_read=FALSE", userID).Scan(&c)
	return c, err
}

// ===== ACTIVITY LOG (tabel: log) =====

type ActivityLogRepository struct{ db *sql.DB }

func NewActivityLogRepository(db *sql.DB) *ActivityLogRepository {
	return &ActivityLogRepository{db: db}
}

func (r *ActivityLogRepository) Create(l *models.ActivityLog) error {
	return r.db.QueryRow(
		"INSERT INTO log (id_user, aksi, tabel_terkait, kolom_terkait, id_data, values_old, values_new) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id_log, updated_at",
		l.IDUser, l.Aksi, l.TabelTerkait, l.KolomTerkait, l.IDData, l.ValuesOld, l.ValuesNew,
	).Scan(&l.ID, &l.UpdatedAt)
}

func (r *ActivityLogRepository) FindAll() ([]models.ActivityLog, error) {
	rows, err := r.db.Query(
		`SELECT l.id_log, l.id_user, COALESCE(u.nama,''), l.aksi,
		        COALESCE(l.tabel_terkait,''), COALESCE(l.kolom_terkait,''),
		        l.id_data, COALESCE(l.values_old,''), COALESCE(l.values_new,''), l.updated_at
		 FROM log l LEFT JOIN users u ON l.id_user = u.id_user ORDER BY l.updated_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.ActivityLog
	for rows.Next() {
		var l models.ActivityLog
		var idData sql.NullInt64
		if err := rows.Scan(&l.ID, &l.IDUser, &l.NamaUser, &l.Aksi,
			&l.TabelTerkait, &l.KolomTerkait, &idData,
			&l.ValuesOld, &l.ValuesNew, &l.UpdatedAt); err != nil {
			return nil, err
		}
		if idData.Valid {
			v := int(idData.Int64)
			l.IDData = &v
		}
		list = append(list, l)
	}
	return list, nil
}

// ===== OTP (tabel: otp) =====

type OTPRepository struct{ db *sql.DB }

func NewOTPRepository(db *sql.DB) *OTPRepository {
	return &OTPRepository{db: db}
}

func (r *OTPRepository) Create(o *models.OTP) error {
	// Invalidate old OTPs for this user
	r.db.Exec("UPDATE otp SET is_used=TRUE WHERE id_user=$1 AND is_used=FALSE", o.IDUser)
	return r.db.QueryRow(
		"INSERT INTO otp (id_user, kode_otp, expires_at) VALUES ($1,$2,$3) RETURNING id_otp, created_at",
		o.IDUser, o.KodeOTP, o.ExpiresAt,
	).Scan(&o.ID, &o.CreatedAt)
}

func (r *OTPRepository) FindValid(userID int, code string) (*models.OTP, error) {
	o := &models.OTP{}
	err := r.db.QueryRow(
		"SELECT id_otp, id_user, kode_otp, expires_at, is_used, created_at FROM otp WHERE id_user=$1 AND kode_otp=$2 AND is_used=FALSE AND expires_at > NOW()",
		userID, code,
	).Scan(&o.ID, &o.IDUser, &o.KodeOTP, &o.ExpiresAt, &o.IsUsed, &o.CreatedAt)
	return o, err
}

func (r *OTPRepository) MarkUsed(id int) error {
	_, err := r.db.Exec("UPDATE otp SET is_used=TRUE WHERE id_otp=$1", id)
	return err
}
