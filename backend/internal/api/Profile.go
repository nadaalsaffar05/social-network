package api

import (
	"database/sql"
	"io"
	"net/http"
	"os"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/gofrs/uuid/v5"
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

func UpdateAvatar(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
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

		// 10 MB max file size
		err := r.ParseMultipartForm(10 << 20)
		if err != nil {
			helpers.SendJSON(w, http.StatusBadRequest, map[string]any{
				"error": "file size too large or invalid multipart form",
			})
			return
		}

		file, header, err := r.FormFile("avatar")
		if err != nil {
			helpers.SendJSON(w, http.StatusBadRequest, map[string]any{
				"error": "avatar file is required",
			})
			return
		}
		defer file.Close()

		mimeType := header.Header.Get("Content-Type")
		if mimeType != "image/jpeg" && mimeType != "image/png" && mimeType != "image/gif" {
			helpers.SendJSON(w, http.StatusBadRequest, map[string]any{
				"error": "only JPEG, PNG, and GIF images are allowed",
			})
			return
		}

		ext := ".jpg"
		if mimeType == "image/png" {
			ext = ".png"
		} else if mimeType == "image/gif" {
			ext = ".gif"
		}

		mediaUUID, err := uuid.NewV4()
		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to generate media id",
			})
			return
		}

		mediaID := mediaUUID.String()
		uploadDir := "uploads/avatars"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to create upload directory",
			})
			return
		}

		relativePath := uploadDir + "/" + mediaID + ext
		dstFile, err := os.Create(relativePath)
		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to save avatar file",
			})
			return
		}
		defer dstFile.Close()

		fileSize, err := io.Copy(dstFile, file)
		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to write avatar file",
			})
			return
		}

		tx, err := database.Begin()
		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to start transaction",
			})
			return
		}
		defer tx.Rollback()

		var existingType int
		var existingMediaID string
		scanErr := tx.QueryRow(`
			SELECT type, media_id FROM profile_avatars WHERE user_id = ?
		`, currentUser.ID).Scan(&existingType, &existingMediaID)

		if scanErr == nil {
			if existingType == 1000 {
				// Unlink generic pool avatar
				_, _ = tx.Exec(`UPDATE profile_avatars SET user_id = NULL WHERE user_id = ?`, currentUser.ID)
			} else if existingType == 1010 {
				// Remove custom avatar mapping
				_, _ = tx.Exec(`DELETE FROM profile_avatars WHERE user_id = ?`, currentUser.ID)
			}
		}

		// Insert into media
		_, err = tx.Exec(`
			INSERT INTO media (id, uploader_id, file_name, file_path, mime_type, file_size)
			VALUES (?, ?, ?, ?, ?, ?)
		`, mediaID, currentUser.ID, header.Filename, relativePath, mimeType, fileSize)
		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to record media entry",
			})
			return
		}

		// Insert custom profile avatar mapping
		_, err = tx.Exec(`
			INSERT INTO profile_avatars (user_id, media_id, type)
			VALUES (?, ?, 1010)
		`, currentUser.ID, mediaID)
		if err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to update profile avatar",
			})
			return
		}

		if err := tx.Commit(); err != nil {
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to commit transaction",
			})
			return
		}

		helpers.SendJSON(w, http.StatusOK, map[string]any{
			"message":     "Avatar updated successfully",
			"avatar_path": relativePath,
		})
	}
}

func GetFollowers(database *sql.DB) http.HandlerFunc {
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
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to fetch followers",
			})
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

		helpers.SendJSON(w, http.StatusOK, map[string]any{
			"followers": followers,
		})
	}
}

func GetFollowing(database *sql.DB) http.HandlerFunc {
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
			helpers.SendJSON(w, http.StatusInternalServerError, map[string]any{
				"error": "failed to fetch following",
			})
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

		helpers.SendJSON(w, http.StatusOK, map[string]any{
			"following": following,
		})
	}
}

