package auth

import (
	"database/sql"
	"net/http"
)

func RegisterRoutes(
	mux *http.ServeMux,
	db *sql.DB,
) {
	handler := &Handler{
		DB: db,
	}

	mux.HandleFunc(
		"/api/register",
		handler.Register,
	)

	mux.HandleFunc(
		"/api/login",
		handler.Login,
	)

	mux.HandleFunc(
		"/api/logout",
		handler.Logout,
	)

	mux.Handle(
		"/api/me",
		Middleware(
			db,
			http.HandlerFunc(handler.Me),
		),
	)
}