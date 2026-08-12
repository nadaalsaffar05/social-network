package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"social-network/internal/auth"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	dbPath := os.Getenv("DB_PATH")

	if dbPath == "" {
		dbPath = "./internal/db/social-network.db"
	}

	db, err := sql.Open(
		"sqlite3",
		dbPath+"?_foreign_keys=on",
	)

	if err != nil {
		log.Fatal(err)
	}

	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}

	if _, err := db.Exec(
		"PRAGMA foreign_keys = ON;",
	); err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()

	auth.RegisterRoutes(
		mux,
		db,
	)


//test


mux.HandleFunc(
	"/test-auth",
	func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(
			w,
			r,
			"./test-auth.html",
		)
	},
)




//test












	mux.HandleFunc(
		"/api/health",
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			w.Header().
				Set(
					"Content-Type",
					"application/json",
				)

			fmt.Fprint(
				w,
				`{"status":"ok"}`,
			)
		},
	)

	fmt.Println(
		"Server running on http://localhost:8080",
	)

	if err := http.ListenAndServe(
		":8080",
		corsMiddleware(mux),
	); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware(
	next http.Handler,
) http.Handler {

	return http.HandlerFunc(
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			origin :=
				r.Header.Get("Origin")

			if origin ==
				"http://localhost:5173" {

				w.Header().Set(
					"Access-Control-Allow-Origin",
					origin,
				)

				w.Header().Set(
					"Access-Control-Allow-Credentials",
					"true",
				)
			}

			w.Header().Set(
				"Access-Control-Allow-Headers",
				"Content-Type",
			)

			w.Header().Set(
				"Access-Control-Allow-Methods",
				"GET, POST, PUT, PATCH, DELETE, OPTIONS",
			)

			if r.Method ==
				http.MethodOptions {

				w.WriteHeader(
					http.StatusNoContent,
				)

				return
			}

			next.ServeHTTP(w, r)
		},
	)
}