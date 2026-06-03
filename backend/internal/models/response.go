package models

// APIResponse is the standard JSON response envelope
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// PaginatedResponse includes pagination metadata
type PaginatedResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Total   int         `json:"total"`
	Page    int         `json:"page"`
	Limit   int         `json:"limit"`
}

// DashboardStats holds role-specific dashboard data
// Feature 4: Admin hanya Surat Masuk, Surat Keluar, Menunggu Persetujuan, History
// Feature 9: Kepsek "Menunggu Persetujuan" (bukan "Review")
// Feature 10: User tambah "Menunggu Persetujuan"
type DashboardStats struct {
	TotalSuratMasuk          int `json:"total_surat_masuk"`
	TotalSuratKeluar         int `json:"total_surat_keluar"`
	SuratMenungguPersetujuan int `json:"surat_menunggu_persetujuan"`
	TotalHistory             int `json:"total_history"`
	TotalUsers               int `json:"total_users,omitempty"`
	TotalDisposisi           int `json:"total_disposisi,omitempty"`
	DisposisiBelumKonfirmasi int `json:"disposisi_belum_konfirmasi,omitempty"`
}
