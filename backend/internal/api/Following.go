package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

// method: GET -- returns all followers of the current user
func GetFollowers(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		currentUser := auth.CurrentUser(r)
		if currentUser == nil {
			helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		targetID := r.URL.Query().Get("user_id")
		if targetID == "" {
			targetID = currentUser.ID
		}

		rows, err := database.Query(`
			SELECT
				u.id,
				u.email,
				u.first_name,
				u.last_name,
				p.nickname,
				p.privacy,
				m.file_path
			FROM follows f
			JOIN users u ON u.id = f.follower_id
			JOIN profiles p ON p.user_id = u.id
			LEFT JOIN profile_avatars pa ON pa.user_id = u.id
			LEFT JOIN media m ON m.id = pa.media_id
			WHERE f.following_id = ?
			ORDER BY f.created_at DESC
		`, targetID)

		followers := []models.FollowUserItem{}
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch followers")
			return
		}
		defer rows.Close()

		for rows.Next() {
			var item models.FollowUserItem
			if scanErr := rows.Scan(
				&item.ID,
				&item.Email,
				&item.FirstName,
				&item.LastName,
				&item.Nickname,
				&item.Privacy,
				&item.AvatarPath,
			); scanErr == nil {
				followers = append(followers, item)
			}
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"followers": followers,
		})
	}
}

// method: GET -- returns all followeing of the current user
func GetFollowing(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		currentUser := auth.CurrentUser(r)
		if currentUser == nil {
			helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		targetID := r.URL.Query().Get("user_id")
		if targetID == "" {
			targetID = currentUser.ID
		}

		rows, err := database.Query(`
			SELECT
				u.id,
				u.email,
				u.first_name,
				u.last_name,
				p.nickname,
				p.privacy,
				m.file_path
			FROM follows f
			JOIN users u ON u.id = f.following_id
			JOIN profiles p ON p.user_id = u.id
			LEFT JOIN profile_avatars pa ON pa.user_id = u.id
			LEFT JOIN media m ON m.id = pa.media_id
			WHERE f.follower_id = ?
			ORDER BY f.created_at DESC
		`, targetID)

		following := []models.FollowUserItem{}
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch following")
			return
		}
		defer rows.Close()

		for rows.Next() {
			var item models.FollowUserItem
			if scanErr := rows.Scan(
				&item.ID,
				&item.Email,
				&item.FirstName,
				&item.LastName,
				&item.Nickname,
				&item.Privacy,
				&item.AvatarPath,
			); scanErr == nil {
				following = append(following, item)
			}
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"following": following,
		})
	}
}

// method: POST -- if a user wants to follow another user
// basically the current user will gain an additional following
func FollowUser(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		currentUser := auth.CurrentUser(r)
		if currentUser == nil {
			helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var req struct {
			UserID string `json:"user_id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		targetID := strings.TrimSpace(req.UserID)
		if targetID == "" {
			targetID = strings.TrimSpace(r.URL.Query().Get("user_id"))
		}

		if targetID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
			return
		}

		if targetID == currentUser.ID {
			helpers.WriteError(w, http.StatusBadRequest, "cannot follow yourself")
			return
		}

		// Check target user existence
		var targetPrivacy int
		err := database.QueryRow(`
			SELECT p.privacy
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			WHERE u.id = ?
		`, targetID).Scan(&targetPrivacy)

		if err != nil {
			helpers.WriteError(w, http.StatusNotFound, "target user not found")
			return
		}

		// follow relationship
		_, err = database.Exec(`
			INSERT INTO follows (follower_id, following_id)
			VALUES (?, ?)
			ON CONFLICT(follower_id, following_id) DO NOTHING
		`, currentUser.ID, targetID)

		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to follow user")
			return
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message":      "successfully followed user",
			"following_id": targetID,
		})
	}
}
