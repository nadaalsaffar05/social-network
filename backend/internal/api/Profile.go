package api

import (
	"database/sql"
	"io"
	"net/http"
	"os"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"
	"social-network/internal/utils"

	"github.com/gofrs/uuid/v5"
)

func GetProfile(database *sql.DB) http.HandlerFunc {
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

		profile, err := utils.GetProfileObject(database, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile")
			return
		}
		if profile.AvatarPath != nil {
			publicPath := "/" + strings.TrimLeft(*profile.AvatarPath, "/")
			profile.AvatarPath = &publicPath
		}

		// fetch count
		_ = database.QueryRow(`SELECT COUNT(*) FROM follows WHERE following_id = ?`, currentUser.ID).Scan(&profile.FollowersCount)
		_ = database.QueryRow(`SELECT COUNT(*) FROM follows WHERE follower_id = ?`, currentUser.ID).Scan(&profile.FollowingCount)

		// Feed and post pages only need the current user's basic profile. Avoid
		// loading every post and its media unless the profile page requests it.
		includePosts := !strings.EqualFold(r.URL.Query().Get("include_posts"), "false")
		profile.Posts = []models.UserPost{}
		if !includePosts {
			helpers.WriteJSON(w, http.StatusOK, map[string]any{
				"user": profile,
			})
			return
		}

		// Full profile view: load the user's posts and their media.
		rows, err := database.Query(`
			SELECT p.id, p.author_id, p.content, p.privacy, p.created_at, p.updated_at,
				COALESCE((SELECT SUM(reaction_type = 'LIKE') FROM post_reactions WHERE post_id = p.id), 0),
				COALESCE((SELECT SUM(reaction_type = 'DISLIKE') FROM post_reactions WHERE post_id = p.id), 0),
				(SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = ?)
			FROM posts p
			WHERE p.author_id = ? AND p.is_active = 1
			ORDER BY created_at DESC
		`, currentUser.ID, currentUser.ID)

		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var post models.UserPost
				if scanErr := rows.Scan(&post.ID, &post.AuthorID, &post.Content, &post.Privacy, &post.CreatedAt, &post.UpdatedAt, &post.LikeCount, &post.DislikeCount, &post.ViewerReaction); scanErr == nil {
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
								post.Media = append(post.Media, "/"+mPath)
							}
						}
						mRows.Close()
					}
					profile.Posts = append(profile.Posts, post)
				}
			}
		}
		profile.PostsCount = len(profile.Posts)

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"user": profile,
		})
	}
}

// method = POST -- params will have a "status": public || private
func UpdateProfileStatus(database *sql.DB) http.HandlerFunc {
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

		// profile, err := utils.GetProfileObject(database, currentUser.ID)
		// if err != nil {
		// 	helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile")
		// 	return
		// }

	}
}

func UpdateAvatar(database *sql.DB) http.HandlerFunc {
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

		// 10 MB max file size
		err := r.ParseMultipartForm(10 << 20)
		if err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "file size too large or invalid multipart form")
			return
		}

		file, header, err := r.FormFile("avatar")
		if err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "avatar file is required")
			return
		}
		defer file.Close()

		mimeType := enums.MediaMIMEType(header.Header.Get("Content-Type"))
		if mimeType != enums.MediaMIMETypeJPEG && mimeType != enums.MediaMIMETypePNG && mimeType != enums.MediaMIMETypeGIF {
			helpers.WriteError(w, http.StatusBadRequest, "only JPEG, PNG, and GIF images are allowed")
			return
		}

		ext := ".jpg"
		if mimeType == enums.MediaMIMETypePNG {
			ext = ".png"
		} else if mimeType == enums.MediaMIMETypeGIF {
			ext = ".gif"
		}

		mediaUUID, err := uuid.NewV4()
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to generate media id")
			return
		}

		mediaID := mediaUUID.String()
		uploadDir := "uploads/avatars"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to create upload directory")
			return
		}

		relativePath := uploadDir + "/" + mediaID + ext
		dstFile, err := os.Create(relativePath)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to save avatar file")
			return
		}
		defer dstFile.Close()

		fileSize, err := io.Copy(dstFile, file)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to write avatar file")
			return
		}

		tx, err := database.Begin()
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to start transaction")
			return
		}
		defer tx.Rollback()

		var existingType int
		var existingMediaID string
		scanErr := tx.QueryRow(`
			SELECT type, media_id FROM profile_avatars WHERE user_id = ?
		`, currentUser.ID).Scan(&existingType, &existingMediaID)

		if scanErr == nil {
			if existingType == int(enums.ProfilePfpTypeGeneric) {
				// Unlink generic pool avatar
				_, _ = tx.Exec(`UPDATE profile_avatars SET user_id = NULL WHERE user_id = ?`, currentUser.ID)
			} else if existingType == int(enums.ProfilePfpTypeCustom) {
				// Remove custom avatar mapping
				_, _ = tx.Exec(`DELETE FROM profile_avatars WHERE user_id = ?`, currentUser.ID)
			}
		}

		// Insert into media
		_, err = tx.Exec(`
			INSERT INTO media (id, uploader_id, file_name, file_path, mime_type, file_size)
			VALUES (?, ?, ?, ?, ?, ?)
		`, mediaID, currentUser.ID, header.Filename, relativePath, string(mimeType), fileSize)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to record media entry")
			return
		}

		// Insert custom profile avatar mapping
		_, err = tx.Exec(`
			INSERT INTO profile_avatars (user_id, media_id, type)
			VALUES (?, ?, ?)
		`, currentUser.ID, mediaID, int(enums.ProfilePfpTypeCustom))
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to update profile avatar")
			return
		}

		if err := tx.Commit(); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to commit transaction")
			return
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message":     "Avatar updated successfully",
			"avatar_path": "/" + relativePath,
		})
	}
}
