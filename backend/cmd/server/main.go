package main

import (
	"log"
	"os"

	"disposisi-surat/internal/config"
	"disposisi-surat/internal/database"
	"disposisi-surat/internal/handlers"
	"disposisi-surat/internal/middleware"
	"disposisi-surat/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  File .env tidak ditemukan, menggunakan env variables")
	}

	cfg := config.Load()

	// Create upload directory
	os.MkdirAll(cfg.UploadDir, 0755)

	// Connect to database
	db, err := database.Connect(cfg.DSN())
	if err != nil {
		log.Fatal("❌ Gagal koneksi database:", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.Migrate(db); err != nil {
		log.Fatal("❌ Gagal migrasi:", err)
	}

	// Seed default data
	if err := database.Seed(db); err != nil {
		log.Fatal("❌ Gagal seed:", err)
	}

	// Ensure required columns exist
	db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_profil TEXT DEFAULT ''")
	db.Exec("ALTER TABLE notifikasi ADD COLUMN IF NOT EXISTS id_referensi INTEGER")
	db.Exec("ALTER TABLE disposisi ADD COLUMN IF NOT EXISTS isi_disposisi TEXT DEFAULT ''")
	db.Exec("ALTER TABLE disposisi ADD COLUMN IF NOT EXISTS batas_waktu TEXT DEFAULT ''")
	// Jabatan-based forwarding: track which jabatan the surat is forwarded to
	db.Exec("ALTER TABLE disposisi ADD COLUMN IF NOT EXISTS id_jabatan_penerima INTEGER REFERENCES jabatan(id_jabatan)")
	// Waka flow: track catatan waka and which waka forwarded
	db.Exec("ALTER TABLE disposisi ADD COLUMN IF NOT EXISTS catatan_waka TEXT DEFAULT ''")
	db.Exec("ALTER TABLE disposisi ADD COLUMN IF NOT EXISTS id_waka INTEGER REFERENCES users(id_user)")

	// Fix notifikasi jenis constraint to include all notification types
	db.Exec("ALTER TABLE notifikasi DROP CONSTRAINT IF EXISTS notifikasi_jenis_check")
	db.Exec(`ALTER TABLE notifikasi ADD CONSTRAINT notifikasi_jenis_check CHECK (
		jenis IN ('surat_masuk_baru','surat_keluar_baru','surat_disetujui','surat_ditolak',
		'surat_masuk_dikonfirmasi','surat_keluar_dikonfirmasi','permintaan_persetujuan_akun',
		'review_surat','surat_diteruskan','surat_diteruskan_waka','disposisi_diterima')
	)`)

	// Jabatan cleanup: ensure a generic 'guru' jabatan exists
	db.Exec(`INSERT INTO jabatan (nama_jabatan, level_akses) VALUES ('guru', 'user') ON CONFLICT DO NOTHING`)

	// Migrate any existing 'user' jabatan to 'guru'
	db.Exec(`UPDATE user_jabatan 
		SET id_jabatan = (SELECT id_jabatan FROM jabatan WHERE nama_jabatan = 'guru' AND level_akses = 'user' LIMIT 1)
		WHERE id_jabatan = (SELECT id_jabatan FROM jabatan WHERE nama_jabatan = 'user' AND level_akses = 'user' LIMIT 1)`)

	// Remove old specific user-level jabatan that are no longer needed (keep only guru)
	db.Exec(`DELETE FROM user_jabatan WHERE id_jabatan IN (
		SELECT id_jabatan FROM jabatan WHERE level_akses = 'user' AND nama_jabatan != 'guru'
	)`)

	// Ensure every user without a jabatan gets the generic 'guru' jabatan
	db.Exec(`INSERT INTO user_jabatan (id_user, id_jabatan, is_primary)
		SELECT u.id_user, j.id_jabatan, true
		FROM users u
		CROSS JOIN jabatan j
		WHERE j.nama_jabatan = 'guru' AND j.level_akses = 'user'
		AND NOT EXISTS (SELECT 1 FROM user_jabatan uj WHERE uj.id_user = u.id_user)
		ON CONFLICT DO NOTHING`)

	// Clean up duplicate non-primary user_jabatan entries (enforce single jabatan)
	db.Exec(`DELETE FROM user_jabatan WHERE is_primary = FALSE`)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	smRepo := repository.NewSuratMasukRepository(db)
	skRepo := repository.NewSuratKeluarRepository(db)
	dispRepo := repository.NewDisposisiRepository(db)
	notifRepo := repository.NewNotificationRepository(db)
	actRepo := repository.NewActivityLogRepository(db)
	otpRepo := repository.NewOTPRepository(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(cfg, userRepo, otpRepo, actRepo)
	userHandler := handlers.NewUserHandler(userRepo, actRepo)
	smHandler := handlers.NewSuratMasukHandler(cfg, smRepo, dispRepo, notifRepo, actRepo, userRepo)
	skHandler := handlers.NewSuratKeluarHandler(cfg, skRepo, notifRepo, actRepo, userRepo)
	profileHandler := handlers.NewProfileHandler(cfg, userRepo, otpRepo, actRepo)
	dispHandler := handlers.NewDisposisiHandler(dispRepo, notifRepo, actRepo, userRepo)
	notifHandler := handlers.NewNotificationHandler(notifRepo)
	actHandler := handlers.NewActivityHandler(actRepo)
	dashHandler := handlers.NewDashboardHandler(smRepo, skRepo, userRepo, dispRepo)

	// Setup Gin router
	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	// Serve uploaded files
	r.Static("/uploads", cfg.UploadDir)

	api := r.Group("/api")
	{
		// Public routes
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/forgot-password", authHandler.ForgotPassword)
		api.POST("/auth/resend-otp", authHandler.ResendOTP) // Feature 1
		api.POST("/auth/verify-otp", authHandler.VerifyOTP)
		api.POST("/auth/reset-password", authHandler.ResetPassword)

		// Protected routes
		auth := api.Group("")
		auth.Use(middleware.AuthMiddleware(cfg))
		{
			auth.POST("/auth/refresh", authHandler.RefreshToken)
			auth.GET("/auth/me", authHandler.GetMe)

			// Dashboard
			auth.GET("/dashboard/stats", dashHandler.Stats)

			// Profile
			auth.GET("/profile", profileHandler.Get)
			auth.PUT("/profile", profileHandler.Update)
			auth.PUT("/profile/password", profileHandler.ChangePassword)
			auth.POST("/profile/photo", profileHandler.UploadPhoto)
			auth.DELETE("/profile/photo", profileHandler.DeletePhoto) // Hapus foto profil
			auth.PUT("/profile/switch-jabatan", profileHandler.SwitchJabatan) // Feature 5: switch jabatan
			auth.POST("/profile/send-otp", authHandler.SendOTPForPasswordChange) // Feature 20

			// Notifications
			auth.GET("/notifications", notifHandler.List)
			auth.GET("/notifications/unread-count", notifHandler.UnreadCount)
			auth.PUT("/notifications/:id/read", notifHandler.MarkAsRead)
			auth.PUT("/notifications/read-all", notifHandler.MarkAllAsRead)

			// Users list accessible to admin, kepsek, pegawai, AND waka (for forward modal)
			adminOrKepsek := auth.Group("")
			adminOrKepsek.Use(middleware.RequireRole("admin", "kepsek", "pegawai", "waka"))
			{
				adminOrKepsek.GET("/users", userHandler.List)
			}

			// Users management (admin only)
			admin := auth.Group("")
			admin.Use(middleware.RequireRole("admin"))
			{
				admin.GET("/users/:id", userHandler.GetByID)
				admin.POST("/users", userHandler.Create)
				admin.PUT("/users/:id", userHandler.Update)
				admin.DELETE("/users/:id", userHandler.Delete)
				admin.GET("/activity-logs", actHandler.List)
			}

			// Surat Masuk - history MUST be before :id to avoid route conflict
			auth.GET("/surat-masuk/history", smHandler.ListHistory)
			auth.GET("/surat-masuk", smHandler.List)
			auth.GET("/surat-masuk/:id", smHandler.GetByID)

			adminTU := auth.Group("")
			adminTU.Use(middleware.RequireRole("admin", "pegawai"))
			{
				adminTU.POST("/surat-masuk", smHandler.Create)
				adminTU.PUT("/surat-masuk/:id", smHandler.Update)
				adminTU.PUT("/surat-masuk/:id/teruskan", smHandler.Forward)
				adminTU.PUT("/surat-masuk/:id/arsip", smHandler.Archive)
				adminTU.DELETE("/surat-masuk/:id", smHandler.Delete) // Feature 23
			}

			kepsek := auth.Group("")
			kepsek.Use(middleware.RequireRole("kepsek"))
			{
				kepsek.PUT("/surat-masuk/:id/review", smHandler.Review)
				kepsek.PUT("/surat-keluar/:id/review", skHandler.Review)
			}

			// Waka: forward surat to individual users
			wakaGroup := auth.Group("")
			wakaGroup.Use(middleware.RequireRole("waka"))
			{
				wakaGroup.PUT("/surat-masuk/:id/teruskan-waka", smHandler.ForwardWaka)
			}

			// Surat Keluar - history MUST be before :id to avoid route conflict
			auth.GET("/surat-keluar/history", skHandler.ListHistory)
			auth.GET("/surat-keluar", skHandler.List)
			auth.GET("/surat-keluar/:id", skHandler.GetByID)

			adminTUKeluar := auth.Group("")
			adminTUKeluar.Use(middleware.RequireRole("admin", "pegawai"))
			{
				adminTUKeluar.POST("/surat-keluar", skHandler.Create)
				adminTUKeluar.PUT("/surat-keluar/:id", skHandler.Update)
				adminTUKeluar.PUT("/surat-keluar/:id/arsip", skHandler.Archive)
				adminTUKeluar.DELETE("/surat-keluar/:id", skHandler.Delete) // Feature 23
			}

			// Disposisi (user)
			auth.GET("/disposisi", dispHandler.ListByUser)
			auth.PUT("/disposisi/:id/confirm", dispHandler.Confirm)
		}
	}

	log.Printf("🚀 Server berjalan di port %s\n", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatal("❌ Gagal menjalankan server:", err)
	}
}
