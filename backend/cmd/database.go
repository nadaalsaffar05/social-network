package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
)

func initDB() (*sql.DB, error) {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./internal/db/social-network.db"
	}
	migrationsPath := os.Getenv("MIGRATIONS_PATH")
	if migrationsPath == "" {
		migrationsPath = "file://internal/db/migrations/sqlite"
	} else if !strings.HasPrefix(migrationsPath, "file://") {
		migrationsPath = "file://" + migrationsPath
	}

	db, err := sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		log.Printf("[Migration Warning] Failed to create migration driver: %v", err)
		return db, nil
	}
	m, err := migrate.NewWithDatabaseInstance(migrationsPath, "sqlite3", driver)
	if err != nil {
		log.Printf("[Migration Warning] Failed to initialize migrations: %v", err)
		return db, nil
	}
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		log.Printf("[Migration Warning] Migration error: %v", err)
	} else {
		log.Println("Database migrations checked and up to date.")
	}
	return db, nil
}
