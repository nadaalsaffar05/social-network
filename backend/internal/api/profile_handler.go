package api

import (
	"database/sql"
	"errors"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"social-network/internal/auth"
	"social-network/internal/enums"
	"social-network/internal/feed"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/gofrs/uuid/v5"
)

func GetProfile(db *sql.DB) http.HandlerFunc {
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

		profile, err := getProfileByID(db, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile")
			return
		}
		profile.FollowersCount, profile.FollowingCount, err = getProfileFollowCounts(db, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile counts")
			return
		}

		profile.Posts = []models.UserPost{}
		if strings.EqualFold(r.URL.Query().Get("include_posts"), "false") {
			helpers.WriteJSON(w, http.StatusOK, map[string]any{"user": profile})
			return
		}

		profile.Posts, err = feed.GetProfilePostsForViewer(db, currentUser.ID, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile posts")
			return
		}
		profile.PostsCount = len(profile.Posts)
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"user": profile})
	}
}

func GetPublicProfile(db *sql.DB) http.HandlerFunc {
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

		profile, err := getProfileByID(db, r.PathValue("user_id"))
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "user not found")
			return
		}
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile")
			return
		}

		followersCount, followingCount, err := getProfileFollowCounts(db, profile.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile counts")
			return
		}
		result := models.PublicProfileResponse{
			ID:             profile.ID,
			FirstName:      profile.FirstName,
			LastName:       profile.LastName,
			Nickname:       profile.Nickname,
			AboutMe:        profile.AboutMe,
			Privacy:        profile.Privacy,
			AvatarPath:     profile.AvatarPath,
			FollowersCount: followersCount,
			FollowingCount: followingCount,
		}
		result.Posts, err = feed.GetProfilePostsForViewer(db, result.ID, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch profile posts")
			return
		}
		result.PostsCount = len(result.Posts)
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"user": result})
	}
}

func SearchUsers(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if auth.CurrentUser(r) == nil {
			helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		query := strings.TrimSpace(r.URL.Query().Get("q"))
		if len([]rune(query)) < 2 {
			helpers.WriteJSON(w, http.StatusOK, map[string]any{"users": []models.FollowUserItem{}})
			return
		}

		users, err := searchProfileUsers(db, query)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to search users")
			return
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"users": users})
	}
}

func UpdateProfile(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut && r.Method != http.MethodPost {
			helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		currentUser := auth.CurrentUser(r)
		if currentUser == nil {
			helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var req models.UpdateProfileRequest
		if err := helpers.ParseJSON(r.Body, &req); err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "invalid request payload")
			return
		}
		req.FirstName = strings.TrimSpace(req.FirstName)
		req.LastName = strings.TrimSpace(req.LastName)
		if !validName(req.FirstName) {
			helpers.WriteError(w, http.StatusBadRequest, "first name must be between 1 and 100 characters")
			return
		}
		if !validName(req.LastName) {
			helpers.WriteError(w, http.StatusBadRequest, "last name must be between 1 and 100 characters")
			return
		}

		dateOfBirth := strings.TrimSpace(req.DateOfBirth)
		if _, err := time.Parse("2006-01-02", dateOfBirth); err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "invalid date of birth format (YYYY-MM-DD expected)")
			return
		}

		nickname, err := normalizeNickname(req.Nickname)
		if err != nil {
			helpers.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		if nickname != nil {
			taken, err := nicknameTaken(db, *nickname, currentUser.ID)
			if err != nil {
				helpers.WriteError(w, http.StatusInternalServerError, "failed to validate nickname")
				return
			}
			if taken {
				helpers.WriteError(w, http.StatusBadRequest, "nickname is already taken")
				return
			}
		}
		aboutMe, err := validateAboutMe(req.AboutMe)
		if err != nil {
			helpers.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		if req.Privacy != enums.ProfilePrivacyPublic && req.Privacy != enums.ProfilePrivacyPrivate {
			helpers.WriteError(w, http.StatusBadRequest, "invalid privacy setting")
			return
		}

		operationError := "failed to update profile"
		if err := helpers.WithTx(db, func(tx *sql.Tx) error {
			if _, err := tx.Exec(`
				UPDATE users
				SET first_name = ?, last_name = ?, date_of_birth = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
				WHERE id = ?
			`, req.FirstName, req.LastName, dateOfBirth, currentUser.ID); err != nil {
				operationError = "failed to update user details"
				return err
			}
			if _, err := tx.Exec(`
				UPDATE profiles
				SET nickname = ?, about_me = ?, privacy = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
				WHERE user_id = ?
			`, nickname, aboutMe, req.Privacy, currentUser.ID); err != nil {
				operationError = "failed to update profile details"
				return err
			}
			return nil
		}); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, operationError)
			return
		}

		profile, err := getProfileByID(db, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch updated profile")
			return
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message": "profile updated successfully",
			"user":    profile,
		})
	}
}

func UpdateAvatar(db *sql.DB) http.HandlerFunc {
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

		r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
		if err := r.ParseMultipartForm(10 << 20); err != nil {
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
		extension := avatarExtension(mimeType)
		mediaUUID, err := uuid.NewV4()
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to generate media id")
			return
		}
		mediaID := mediaUUID.String()
		uploadDir := "uploads/avatars"
		if err := os.MkdirAll(uploadDir, 0o755); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to create upload directory")
			return
		}
		relativePath := uploadDir + "/" + mediaID + extension
		keepFile := false
		defer func() {
			if !keepFile {
				_ = os.Remove(relativePath)
			}
		}()

		destination, err := os.Create(relativePath)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to save avatar file")
			return
		}
		fileSize, copyErr := io.Copy(destination, file)
		closeErr := destination.Close()
		if copyErr != nil || closeErr != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to write avatar file")
			return
		}

		operationError := "failed to update profile avatar"
		if err := helpers.WithTx(db, func(tx *sql.Tx) error {
			var existingType enums.ProfilePfpType
			err := tx.QueryRow(`
				SELECT type
				FROM profile_avatars
				WHERE user_id = ?
			`, currentUser.ID).Scan(&existingType)
			switch {
			case err == nil && existingType == enums.ProfilePfpTypeGeneric:
				if _, err := tx.Exec(`UPDATE profile_avatars SET user_id = NULL WHERE user_id = ?`, currentUser.ID); err != nil {
					return err
				}
			case err == nil && existingType == enums.ProfilePfpTypeCustom:
				if _, err := tx.Exec(`DELETE FROM profile_avatars WHERE user_id = ?`, currentUser.ID); err != nil {
					return err
				}
			case errors.Is(err, sql.ErrNoRows):
			case err != nil:
				return err
			}

			operationError = "failed to record media entry"
			if _, err := tx.Exec(`
				INSERT INTO media (id, uploader_id, file_name, file_path, mime_type, file_size)
				VALUES (?, ?, ?, ?, ?, ?)
			`, mediaID, currentUser.ID, header.Filename, relativePath, string(mimeType), fileSize); err != nil {
				return err
			}
			operationError = "failed to update profile avatar"
			_, err = tx.Exec(`
				INSERT INTO profile_avatars (user_id, media_id, type)
				VALUES (?, ?, ?)
			`, currentUser.ID, mediaID, enums.ProfilePfpTypeCustom)
			return err
		}); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, operationError)
			return
		}

		keepFile = true
		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message":     "avatar updated successfully",
			"avatar_path": helpers.PublicMediaPath(&relativePath),
		})
	}
}

func validName(value string) bool {
	length := len([]rune(value))
	return length >= 1 && length <= 100
}

func normalizeNickname(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	nickname := strings.TrimSpace(*value)
	if nickname == "" {
		return nil, nil
	}
	length := len([]rune(nickname))
	if length < 3 || length > 40 {
		return nil, errors.New("nickname must be between 3 and 40 characters")
	}
	return &nickname, nil
}

func validateAboutMe(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	aboutMe := strings.TrimSpace(*value)
	if aboutMe == "" {
		return nil, nil
	}
	if len([]rune(aboutMe)) > 2000 {
		return nil, errors.New("about me must not exceed 2000 characters")
	}
	return &aboutMe, nil
}

func avatarExtension(mimeType enums.MediaMIMEType) string {
	switch mimeType {
	case enums.MediaMIMETypePNG:
		return ".png"
	case enums.MediaMIMETypeGIF:
		return ".gif"
	default:
		return ".jpg"
	}
}
