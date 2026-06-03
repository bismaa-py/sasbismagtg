package models

import "time"

// Tabel: notifikasi (id_notifikasi, id_penerima, id_pengirim, judul, pesan, jenis,
//   id_referensi, is_read, waktu_baca, created_at, link_url, tipe_referensi)

type Notification struct {
	ID             int        `json:"id"`
	IDPenerima     int        `json:"id_penerima"`
	IDPengirim     *int       `json:"id_pengirim,omitempty"`
	Judul          string     `json:"judul"`
	Pesan          string     `json:"pesan"`
	Jenis          string     `json:"jenis"`
	IDReferensi    *int       `json:"id_referensi,omitempty"`
	IsRead         bool       `json:"is_read"`
	WaktuBaca      *time.Time `json:"waktu_baca,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	LinkURL        string     `json:"link_url,omitempty"`
	TipeReferensi  string     `json:"tipe_referensi,omitempty"`
}
