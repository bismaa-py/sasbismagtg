package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSLMODE"),
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	query := `SELECT u.id_user, u.nama, u.email, COALESCE(j.level_akses, 'none')
		FROM users u
		LEFT JOIN user_jabatan uj ON u.id_user = uj.id_user AND uj.is_primary = TRUE
		LEFT JOIN jabatan j ON uj.id_jabatan = j.id_jabatan
		ORDER BY u.id_user`

	rows, err := db.Query(query)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("ID User | Nama | Email | Role/Level Akses")
	fmt.Println("------------------------------------------")
	for rows.Next() {
		var id int
		var nama, email, role string
		if err := rows.Scan(&id, &nama, &email, &role); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%d | %s | %s | %s\n", id, nama, email, role)
	}
}
