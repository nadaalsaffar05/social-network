package api

import (
	"database/sql"
	"net/http"
	"social-network/internal/helpers"
)

func GetProfile(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			helpers.SendJSON(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
	}
}
