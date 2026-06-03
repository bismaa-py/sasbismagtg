package repository

import (
	"database/sql"
	"disposisi-surat/internal/models"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// scanUser scans a user row with role from jabatan join
func scanUser(row interface{ Scan(...interface{}) error }) (*models.User, error) {
	user := &models.User{}
	var role, namaJabatan, fotoProfil sql.NullString
	err := row.Scan(&user.ID, &user.Nama, &user.Email, &user.Password, &user.CreatedAt, &role, &namaJabatan, &fotoProfil)
	if err != nil {
		return nil, err
	}
	if role.Valid {
		user.Role = role.String
	}
	if namaJabatan.Valid {
		user.NamaJabatan = namaJabatan.String
	}
	if fotoProfil.Valid {
		user.FotoProfil = fotoProfil.String
	}
	return user, nil
}

const userSelectQuery = `SELECT u.id_user, u.nama, u.email, u.password, u.created_at,
	j.level_akses, j.nama_jabatan, u.foto_profil
	FROM users u
	LEFT JOIN user_jabatan uj ON u.id_user = uj.id_user AND uj.is_primary = TRUE
	LEFT JOIN jabatan j ON uj.id_jabatan = j.id_jabatan`

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	user, err := scanUser(r.db.QueryRow(userSelectQuery+" WHERE u.email = $1", email))
	if err != nil {
		return nil, err
	}
	user.SemuaJabatan, _ = r.FindJabatanByUserID(user.ID)
	return user, nil
}

func (r *UserRepository) FindByID(id int) (*models.User, error) {
	user, err := scanUser(r.db.QueryRow(userSelectQuery+" WHERE u.id_user = $1", id))
	if err != nil {
		return nil, err
	}
	// Feature 19: Load all jabatan
	user.SemuaJabatan, _ = r.FindJabatanByUserID(id)
	return user, nil
}

func (r *UserRepository) FindAll() ([]models.User, error) {
	rows, err := r.db.Query(userSelectQuery + " ORDER BY u.created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		// Feature 19: Load all jabatan for each user
		u.SemuaJabatan, _ = r.FindJabatanByUserID(u.ID)
		users = append(users, *u)
	}
	return users, nil
}

func (r *UserRepository) FindByRole(role string) ([]models.User, error) {
	rows, err := r.db.Query(userSelectQuery+" WHERE j.level_akses = $1 ORDER BY u.nama", role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	return users, nil
}

func (r *UserRepository) Create(user *models.User) error {
	return r.db.QueryRow(
		"INSERT INTO users (nama, email, password) VALUES ($1, $2, $3) RETURNING id_user, created_at",
		user.Nama, user.Email, user.Password,
	).Scan(&user.ID, &user.CreatedAt)
}

func (r *UserRepository) AssignJabatan(userID, jabatanID int, isPrimary bool) error {
	_, err := r.db.Exec(
		"INSERT INTO user_jabatan (id_user, id_jabatan, is_primary) VALUES ($1, $2, $3) ON CONFLICT (id_user, id_jabatan) DO UPDATE SET is_primary = $3",
		userID, jabatanID, isPrimary,
	)
	return err
}

func (r *UserRepository) RemoveAllJabatan(userID int) error {
	_, err := r.db.Exec("DELETE FROM user_jabatan WHERE id_user = $1", userID)
	return err
}

// Feature 19: Find all jabatan for a user
func (r *UserRepository) FindJabatanByUserID(userID int) ([]models.JabatanInfo, error) {
	rows, err := r.db.Query(
		`SELECT j.id_jabatan, j.nama_jabatan, j.level_akses, uj.is_primary
		 FROM user_jabatan uj
		 JOIN jabatan j ON uj.id_jabatan = j.id_jabatan
		 WHERE uj.id_user = $1 ORDER BY uj.is_primary DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.JabatanInfo
	for rows.Next() {
		var j models.JabatanInfo
		if err := rows.Scan(&j.IDJabatan, &j.NamaJabatan, &j.LevelAkses, &j.IsPrimary); err != nil {
			return nil, err
		}
		list = append(list, j)
	}
	return list, nil
}

// SetPrimaryJabatan: switch active jabatan by setting is_primary
func (r *UserRepository) SetPrimaryJabatan(userID, jabatanID int) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	// Set all to non-primary
	_, err = tx.Exec("UPDATE user_jabatan SET is_primary = FALSE WHERE id_user = $1", userID)
	if err != nil {
		tx.Rollback()
		return err
	}
	// Set the selected one as primary
	_, err = tx.Exec("UPDATE user_jabatan SET is_primary = TRUE WHERE id_user = $1 AND id_jabatan = $2", userID, jabatanID)
	if err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func (r *UserRepository) Update(user *models.User) error {
	_, err := r.db.Exec(
		"UPDATE users SET nama=$1, email=$2 WHERE id_user=$3",
		user.Nama, user.Email, user.ID,
	)
	return err
}

func (r *UserRepository) UpdatePassword(id int, hash string) error {
	_, err := r.db.Exec("UPDATE users SET password=$1 WHERE id_user=$2", hash, id)
	return err
}

// Feature 14: Update profile photo
func (r *UserRepository) UpdateFotoProfil(id int, path string) error {
	_, err := r.db.Exec("UPDATE users SET foto_profil=$1 WHERE id_user=$2", path, id)
	return err
}

func (r *UserRepository) UpdateProfile(id int, nama string) error {
	_, err := r.db.Exec(
		"UPDATE users SET nama=$1 WHERE id_user=$2",
		nama, id,
	)
	return err
}

func (r *UserRepository) Delete(id int) error {
	// Cascade delete all related records before deleting the user
	r.db.Exec("DELETE FROM notifikasi WHERE id_penerima = $1 OR id_pengirim = $1", id)
	r.db.Exec("DELETE FROM disposisi WHERE id_penerima = $1 OR id_kepsek = $1", id)
	r.db.Exec("DELETE FROM otp WHERE id_user = $1", id)
	r.db.Exec("DELETE FROM log WHERE id_user = $1", id)
	r.db.Exec("DELETE FROM user_jabatan WHERE id_user = $1", id)
	_, err := r.db.Exec("DELETE FROM users WHERE id_user = $1", id)
	return err
}

func (r *UserRepository) Count() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	return count, err
}

func (r *UserRepository) IsAdminOrKepsekJabatan(jabatanID int) (bool, error) {
	var levelAkses string
	err := r.db.QueryRow("SELECT level_akses FROM jabatan WHERE id_jabatan = $1", jabatanID).Scan(&levelAkses)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return levelAkses == "admin" || levelAkses == "kepsek", nil
}
