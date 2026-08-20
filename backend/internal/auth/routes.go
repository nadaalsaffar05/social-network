package auth

import (
	"database/sql"
	"net/http"
)

func RegisterRoutes(
	mux *http.ServeMux,
	db *sql.DB,
) {
	authHandler := &Handler{
		DB: db,
	}

	mux.HandleFunc(
		"/api/register",
		authHandler.Register,
	)

	mux.HandleFunc(
		"/api/login",
		authHandler.Login,
	)

	mux.HandleFunc(
		"/api/logout",
		authHandler.Logout,
	)

	mux.Handle(
		"/api/me",
		Middleware(
			db,
			http.HandlerFunc(authHandler.Me),
		),
	)
}
