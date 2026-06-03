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

	rows, err := db.Query("SELECT id_disposisi, id_surat_masuk, id_penerima, id_jabatan_penerima, status_disposisi FROM disposisi ORDER BY id_disposisi DESC LIMIT 10")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("ID Disp | ID Surat | ID Penerima | ID Jabatan | Status")
	fmt.Println("-------------------------------------------------------")
	for rows.Next() {
		var id, smID, recipientID int
		var jabID sql.NullInt64
		var status sql.NullString
		if err := rows.Scan(&id, &smID, &recipientID, &jabID, &status); err != nil {
			log.Fatal(err)
		}
		jabStr := "NULL"
		if jabID.Valid {
			jabStr = fmt.Sprintf("%d", jabID.Int64)
		}
		statStr := "NULL"
		if status.Valid {
			statStr = status.String
		}
		fmt.Printf("%d | %d | %d | %s | %s\n", id, smID, recipientID, jabStr, statStr)
	}
}
