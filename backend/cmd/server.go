package main

import (
	"database/sql"
	"net/http"

	"social-network/internal/config"
)

func newServer(db *sql.DB, port string) *http.Server {
	return &http.Server{Addr: ":" + port, Handler: corsMiddleware(newRouter(db))}
}

func corsMiddleware(next http.Handler) http.Handler {
	allowedOrigin := config.FrontendOrigin()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = allowedOrigin
		}
		if origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		}
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With, Origin")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
