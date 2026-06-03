package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func Connect(dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("gagal koneksi ke database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("gagal ping database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	log.Println("✅ Terhubung ke PostgreSQL")
	return db, nil
}

// Migrate - Database sudah ada, tidak perlu membuat tabel
func Migrate(db *sql.DB) error {
	log.Println("ℹ️  Menggunakan database yang sudah ada (skip migrasi)")
	return nil
}

// Seed - Database sudah memiliki data, skip seeding
func Seed(db *sql.DB) error {
	// Check if any users exist
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}

	if count > 0 {
		log.Printf("ℹ️  Database sudah memiliki %d user, skip seeding\n", count)
		return nil
	}

	log.Println("⚠️  Database kosong, silakan tambah user melalui admin panel")
	return nil
}
