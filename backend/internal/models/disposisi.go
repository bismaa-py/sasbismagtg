package models

import "time"

// Tabel: disposisi (id_disposisi, sifat, isi_disposisi, batas_waktu, proses_lanjut,
//   koordinasi_konfirmasi, id_surat_masuk, id_kepsek, id_penerima,
//   tanggal_disposisi, status_disposisi, status_approval, approval_at)

type Disposisi struct {
	ID                   int        `json:"id"`
	Sifat                string     `json:"sifat"`
	IsiDisposisi         string     `json:"isi_disposisi"`
	BatasWaktu           string     `json:"batas_waktu"`
	ProsesLanjut         string     `json:"proses_lanjut"`
	KoordinasiKonfirmasi string     `json:"koordinasi_konfirmasi"`
	IDSuratMasuk         int        `json:"id_surat_masuk"`
	IDKepsek             int        `json:"id_kepsek"`
	IDPenerima           int        `json:"id_penerima"`
	IDJabatanPenerima    *int       `json:"id_jabatan_penerima,omitempty"`
	IDWaka               *int       `json:"id_waka,omitempty"`
	CatatanWaka          string     `json:"catatan_waka,omitempty"`
	TanggalDisposisi     time.Time  `json:"tanggal_disposisi"`
	StatusDisposisi      string     `json:"status_disposisi"`
	StatusApproval       string     `json:"status_approval"`
	ApprovalAt           *time.Time `json:"approval_at,omitempty"`
	// Computed from JOINs
	NamaKepsek           string     `json:"nama_kepsek,omitempty"`
	NamaPenerima         string     `json:"nama_penerima,omitempty"`
	NamaJabatanPenerima  string     `json:"nama_jabatan_penerima,omitempty"`
	NamaWaka             string     `json:"nama_waka,omitempty"`
}

// DisposisiDetail includes the letter information
type DisposisiDetail struct {
	Disposisi
	NoSurat       string `json:"no_surat"`
	PerihalSurat  string `json:"perihal_surat"`
	AsalSurat     string `json:"asal_surat"`
	FilePDF       string `json:"file_pdf"`
}

type CreateDisposisiRequest struct {
	Sifat                string `json:"sifat" binding:"required,oneof=segera rahasia sangat_rahasia"`
	IsiDisposisi         string `json:"isi_disposisi"`
	BatasWaktu           string `json:"batas_waktu"`
	ProsesLanjut         string `json:"proses_lanjut"`
	KoordinasiKonfirmasi string `json:"koordinasi_konfirmasi"`
	IDSuratMasuk         int    `json:"id_surat_masuk" binding:"required"`
	IDPenerima           int    `json:"id_penerima" binding:"required"`
}
