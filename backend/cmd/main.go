package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	"social-network/internal/auth"

	_ "github.com/mattn/go-sqlite3"
)

func initializeDB() *sql.DB {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./internal/db/social-network.db"
	}

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		log.Fatal(err)
	}

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	return db
}

func main() {
	db := initializeDB()
	defer db.Close()

	mux := http.NewServeMux()

	auth.RegisterRoutes(mux, db)

	log.Println("Server running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}