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
				p.privacy,
				m.file_path
			FROM users u
			JOIN profiles p ON p.user_id = u.id
			LEFT JOIN profile_avatars pa ON pa.user_id = u.id
			LEFT JOIN media m ON m.id = pa.media_id
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
			&profile.AvatarPath,
		)

		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to fetch profile",
			})
			return
		}

		// fetch count
		_ = database.QueryRow(`SELECT COUNT(*) FROM follows WHERE following_id = ?`, currentUser.ID).Scan(&profile.FollowersCount)
		_ = database.QueryRow(`SELECT COUNT(*) FROM follows WHERE follower_id = ?`, currentUser.ID).Scan(&profile.FollowingCount)

		// user posts
		profile.Posts = []models.UserPost{}
		rows, err := database.Query(`
			SELECT id, author_id, content, privacy, created_at, updated_at
			FROM posts
			WHERE author_id = ? AND is_active = 1
			ORDER BY created_at DESC
		`, currentUser.ID)

		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var post models.UserPost
				if scanErr := rows.Scan(&post.ID, &post.AuthorID, &post.Content, &post.Privacy, &post.CreatedAt, &post.UpdatedAt); scanErr == nil {
					mRows, mErr := database.Query(`
						SELECT m.file_path
						FROM post_media pm
						JOIN media m ON m.id = pm.media_id
						WHERE pm.post_id = ?
					`, post.ID)
					if mErr == nil {
						for mRows.Next() {
							var mPath string
							if mScanErr := mRows.Scan(&mPath); mScanErr == nil {
								post.Media = append(post.Media, mPath)
							}
						}
						mRows.Close()
					}
					profile.Posts = append(profile.Posts, post)
				}
			}
		}
		profile.PostsCount = len(profile.Posts)

		helpers.SendJSON(w, http.StatusOK, map[string]any{
			"user": profile,
		})
	}
}
