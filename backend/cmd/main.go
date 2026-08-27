package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"social-network/internal/api"
	"social-network/internal/auth"
	"social-network/internal/feed"

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

	m, err := migrate.NewWithDatabaseInstance(
		migrationsPath,
		"sqlite3",
		driver,
	)
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

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "http://localhost:5173"
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, Accept, X-Requested-With, Origin",
		)
		w.Header().Set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, OPTIONS",
		)

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	mux.Handle(
		"/static/",
		http.StripPrefix(
			"/static/",
			http.FileServer(http.Dir(".")),
		),
	)

	authHandler := &auth.Handler{DB: db}
	feedHandler := feed.NewHandler(db)

	mux.HandleFunc("/api/register", authHandler.Register)
	mux.HandleFunc("/api/login", authHandler.Login)
	mux.HandleFunc("/api/logout", authHandler.Logout)

	mux.Handle(
		"/api/profile",
		auth.Middleware(db, api.GetProfile(db)),
	)

	mux.Handle(
		"/api/profile/avatar",
		auth.Middleware(db, api.UpdateAvatar(db)),
	)

	mux.Handle(
		"/api/followers",
		auth.Middleware(db, api.GetFollowers(db)),
	)

	mux.Handle(
		"/api/following",
		auth.Middleware(db, api.GetFollowing(db)),
	)

	mux.Handle(
		"/api/follow",
		auth.Middleware(db, api.FollowUser(db)),
	)

	mux.Handle(
		"/api/unfollow",
		auth.Middleware(db, api.UnfollowUser(db)),
	)

	mux.Handle(
		"/api/is-follower",
		auth.Middleware(db, api.IsFollower(db)),
	)

	mux.Handle(
		"/api/is-following",
		auth.Middleware(db, api.IsFollowing(db)),
	)

	mux.Handle(
		"/api/follow-request/respond",
		auth.Middleware(db, api.RespondToFollowRequest(db)),
	)

	mux.Handle(
		"/api/posts",
		auth.Middleware(
			db,
			http.HandlerFunc(feedHandler.CreatePost),
		),
	)

	mux.Handle(
		"/api/feed",
		auth.Middleware(
			db,
			http.HandlerFunc(feedHandler.GetFeed),
		),
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on http://localhost:%s\n", port)

	log.Fatal(
		http.ListenAndServe(
			":"+port,
			corsMiddleware(mux),
		),
	)
}
