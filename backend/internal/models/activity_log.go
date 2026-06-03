package models

import "time"

// Tabel: log (id_log, id_user, aksi, tabel_terkait, kolom_terkait, id_data, values_old, values_new, updated_at)

type ActivityLog struct {
	ID            int       `json:"id"`
	IDUser        int       `json:"id_user"`
	NamaUser      string    `json:"nama_user,omitempty"`
	Aksi          string    `json:"aksi"`
	TabelTerkait  string    `json:"tabel_terkait"`
	KolomTerkait  string    `json:"kolom_terkait"`
	IDData        *int      `json:"id_data,omitempty"`
	ValuesOld     string    `json:"values_old,omitempty"`
	ValuesNew     string    `json:"values_new,omitempty"`
	UpdatedAt     time.Time `json:"updated_at"`
}
