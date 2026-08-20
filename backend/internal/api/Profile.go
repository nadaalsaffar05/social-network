package api

import (
	"database/sql"
	"net/http"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

func GetProfile(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			helpers.SendJSON(w, http.StatusMethodNotAllowed, map[string]any{
				"error": "method not allowed",
			})
			return
		}

		currentUser := auth.CurrentUser(r)
		if currentUser == nil {
			helpers.SendJSON(w, http.StatusUnauthorized, map[string]any{
				"error": "unauthorized",
			})
			return
		}

		var profile models.ProfileResponse
		err := database.QueryRow(`
			SELECT
				u.id,
				u.email,
				u.first_name,
				u.last_name,
				u.date_of_birth,
				p.nickname,
				p.about_me,
				p.privacy
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			WHERE u.id = ?
		`, currentUser.ID).Scan(
			&profile.ID,
			&profile.Email,
			&profile.FirstName,
			&profile.LastName,
			&profile.DateOfBirth,
			&profile.Nickname,
			&profile.AboutMe,
			&profile.Privacy,
		)

		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to fetch profile",
			})
			return
		}

		helpers.SendJSON(w, http.StatusOK, map[string]any{
			"user": profile,
		})
	}
}
