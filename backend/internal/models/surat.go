package models

import "time"

// ===== SURAT MASUK =====
// Tabel: surat_masuk (id_surat_masuk, no_surat, perihal_surat, asal_surat, tanggal_surat,
//   file_pdf, tanggal_diterima, status_verifikasi, user_verifikasi, tanggal_verifikasi,
//   catatan_verifikasi, created_at, id_disposisi_aktif, status_alur, updated_at)

type SuratMasuk struct {
	ID                 int        `json:"id"`
	NoSurat            string     `json:"no_surat"`
	PerihalSurat       string     `json:"perihal_surat"`
	AsalSurat          string     `json:"asal_surat"`
	TanggalSurat       string     `json:"tanggal_surat"`
	FilePDF            string     `json:"file_pdf"`
	TanggalDiterima    string     `json:"tanggal_diterima"`
	StatusVerifikasi   string     `json:"status_verifikasi"`
	UserVerifikasi     *int       `json:"user_verifikasi,omitempty"`
	TanggalVerifikasi  *time.Time `json:"tanggal_verifikasi,omitempty"`
	CatatanVerifikasi  string     `json:"catatan_verifikasi"`
	CreatedAt          time.Time  `json:"created_at"`
	IDDisposisiAktif   *int       `json:"id_disposisi_aktif,omitempty"`
	StatusAlur         string     `json:"status_alur"`
	UpdatedAt          time.Time  `json:"updated_at"`
	// Computed fields (from JOINs)
	NamaVerifikator    string     `json:"nama_verifikator,omitempty"`
	// Disposisi info for user list view
	DisposisiID        *int       `json:"disposisi_id,omitempty"`
	DisposisiStatus    string     `json:"disposisi_status,omitempty"`
}

type CreateSuratMasukRequest struct {
	NoSurat       string `json:"no_surat" binding:"required"`
	PerihalSurat  string `json:"perihal_surat" binding:"required"`
	AsalSurat     string `json:"asal_surat" binding:"required"`
	TanggalSurat  string `json:"tanggal_surat" binding:"required"`
}

type UpdateSuratMasukRequest struct {
	NoSurat       string `json:"no_surat"`
	PerihalSurat  string `json:"perihal_surat"`
	AsalSurat     string `json:"asal_surat"`
	TanggalSurat  string `json:"tanggal_surat"`
}

type ReviewSuratMasukRequest struct {
	Status         string   `json:"status" binding:"required,oneof=disetujui ditolak"`
	Catatan        string   `json:"catatan"`
	DiteruskanKe   []int    `json:"diteruskan_ke"`
	TargetPenerima []string `json:"target_penerima"` // nama-nama penerima yang dipilih kepsek
}

type ForwardSuratMasukRequest struct {
	DiteruskanKe []int          `json:"diteruskan_ke"` // user IDs of waka to forward to
	Targets      []ForwardTarget `json:"targets"`       // backward compat: user+jabatan pairs
}

// ForwardTarget: each forwarding target specifies a user and which jabatan to target
type ForwardTarget struct {
	UserID    int `json:"user_id"`
	JabatanID int `json:"jabatan_id"`
}

// ForwardWakaRequest: Waka forwards surat to individual users with a note
type ForwardWakaRequest struct {
	DiteruskanKe []int  `json:"diteruskan_ke" binding:"required"` // user IDs to forward to
	CatatanWaka  string `json:"catatan_waka"`                     // note from waka to users
}

// ===== SURAT KELUAR =====
// Tabel: surat_keluar (id_surat_keluar, kode_surat(int), no_surat, perihal, catatan,
//   tanggal_surat, file_pdf, status_verifikasi, user_verifikasi, tanggal_verifikasi,
//   tujuan, catatan_verifikasi, created_at, updated_at, status_alur)

type SuratKeluar struct {
	ID                 int        `json:"id"`
	KodeSurat          int        `json:"kode_surat"`
	NoSurat            string     `json:"no_surat"`
	Perihal            string     `json:"perihal"`
	Catatan            string     `json:"catatan"`
	TanggalSurat       string     `json:"tanggal_surat"`
	FilePDF            string     `json:"file_pdf"`
	StatusVerifikasi   string     `json:"status_verifikasi"`
	UserVerifikasi     *int       `json:"user_verifikasi,omitempty"`
	TanggalVerifikasi  *time.Time `json:"tanggal_verifikasi,omitempty"`
	Tujuan             string     `json:"tujuan"`
	CatatanVerifikasi  string     `json:"catatan_verifikasi"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	StatusAlur         string     `json:"status_alur"`
	// Computed
	NamaVerifikator    string     `json:"nama_verifikator,omitempty"`
}

type CreateSuratKeluarRequest struct {
	KodeSurat    int    `json:"kode_surat" binding:"required"`
	NoSurat      string `json:"no_surat" binding:"required"`
	Perihal      string `json:"perihal" binding:"required"`
	TanggalSurat string `json:"tanggal_surat" binding:"required"`
	Tujuan       string `json:"tujuan"`
	Catatan      string `json:"catatan"`
}

type UpdateSuratKeluarRequest struct {
	KodeSurat    int    `json:"kode_surat"`
	NoSurat      string `json:"no_surat"`
	Perihal      string `json:"perihal"`
	TanggalSurat string `json:"tanggal_surat"`
	Tujuan       string `json:"tujuan"`
	Catatan      string `json:"catatan"`
}

type ReviewSuratKeluarRequest struct {
	Status  string `json:"status" binding:"required,oneof=disetujui ditolak"`
	Catatan string `json:"catatan"`
}
