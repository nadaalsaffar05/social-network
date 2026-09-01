package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/gofrs/uuid/v5"
)

// method: GET -- returns all followers of the current user
// add user_id param in the url to check a target userID
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
				if item.AvatarPath != nil {
					publicPath := "/" + strings.TrimLeft(*item.AvatarPath, "/")
					item.AvatarPath = &publicPath
				}
				followers = append(followers, item)
			}
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"followers": followers,
		})
	}
}

// method: GET -- returns all following of the current user
// add user_id param in the url to check a target userID
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
				if item.AvatarPath != nil {
					publicPath := "/" + strings.TrimLeft(*item.AvatarPath, "/")
					item.AvatarPath = &publicPath
				}
				following = append(following, item)
			}
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"following": following,
		})
	}
}

// method: POST -- follow a user + the follow will depend on the profile status
// params: user_id: target user id
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

		// check target user exist
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

		// might be deleted
		var alreadyFollowing int
		_ = database.QueryRow(`
			SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = ?
		`, currentUser.ID, targetID).Scan(&alreadyFollowing)
		if alreadyFollowing > 0 {
			helpers.WriteError(w, http.StatusConflict, "already following this user")
			return
		}

		// if public
		if targetPrivacy == int(enums.ProfilePrivacyPublic) {
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
				"status":       "following",
			})
			return
		}

		//if private
		var pendingRequestID string
		pendingErr := database.QueryRow(`
			SELECT id FROM follow_requests
			WHERE sender_id = ? AND recipient_id = ? AND status = ?
		`, currentUser.ID, targetID, int(enums.FollowRequestStatusPending)).Scan(&pendingRequestID)

		if pendingErr == nil {
			//check if pending req is alr there
			helpers.WriteJSON(w, http.StatusOK, map[string]any{
				"message":           "follow request already pending",
				"follow_request_id": pendingRequestID,
				"status":            "pending",
			})
			return
		}

		// new request entry
		requestUUID, uuidErr := uuid.NewV4()
		if uuidErr != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to generate request id")
			return
		}
		requestID := requestUUID.String()

		_, err = database.Exec(`
			INSERT INTO follow_requests (id, sender_id, recipient_id, status)
			VALUES (?, ?, ?, ?)
		`, requestID, currentUser.ID, targetID, int(enums.FollowRequestStatusPending))

		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to send follow request")
			return
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message":           "follow request sent",
			"follow_request_id": requestID,
			"status":            "pending",
		})
	}
}

// method: POST -- respond to a follow request (accept or decline).
// Body:  request_id: reqID,
//
//	action : accept || decline
func RespondToFollowRequest(database *sql.DB) http.HandlerFunc {
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

		//TODO: move it to DTOs
		var req struct {
			RequestID string `json:"request_id"`
			Action    string `json:"action"` // accept or decline
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		req.RequestID = strings.TrimSpace(req.RequestID)
		req.Action = strings.ToLower(strings.TrimSpace(req.Action))

		if req.RequestID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "request_id is required")
			return
		}
		if req.Action != "accept" && req.Action != "decline" {
			helpers.WriteError(w, http.StatusBadRequest, "action must be 'accept' or 'decline'")
			return
		}

		var senderID, recipientID string
		var currentStatus int
		err := database.QueryRow(`
			SELECT sender_id, recipient_id, status
			FROM follow_requests
			WHERE id = ?
		`, req.RequestID).Scan(&senderID, &recipientID, &currentStatus)

		if err != nil {
			helpers.WriteError(w, http.StatusNotFound, "follow request not found")
			return
		}

		if recipientID != currentUser.ID {
			helpers.WriteError(w, http.StatusForbidden, "you are not the recipient of this request")
			return
		}

		if currentStatus != int(enums.FollowRequestStatusPending) {
			helpers.WriteError(w, http.StatusConflict, "follow request has already been responded to")
			return
		}

		newStatus := int(enums.FollowRequestStatusDeclined)
		if req.Action == "accept" {
			newStatus = int(enums.FollowRequestStatusAccepted)
		}

		tx, txErr := database.Begin()
		if txErr != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to start transaction")
			return
		}
		defer tx.Rollback()

		_, err = tx.Exec(`
			UPDATE follow_requests
			SET status = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
			WHERE id = ?
		`, newStatus, req.RequestID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to update follow request")
			return
		}

		// If accepted, create the follow relationship
		if req.Action == "accept" {
			_, err = tx.Exec(`
				INSERT INTO follows (follower_id, following_id)
				VALUES (?, ?)
				ON CONFLICT(follower_id, following_id) DO NOTHING
			`, senderID, recipientID)
			if err != nil {
				helpers.WriteError(w, http.StatusInternalServerError, "failed to create follow relationship")
				return
			}
		}

		if err := tx.Commit(); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to commit transaction")
			return
		}

		message := "follow request declined"
		if req.Action == "accept" {
			message = "follow request accepted"
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message": message,
			"status":  req.Action + "ed",
		})
	}
}

// GetFollowRequests returns pending follow requests for the authenticated user.
func GetFollowRequests(database *sql.DB) http.HandlerFunc {
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

		rows, err := database.Query(`
			SELECT request.id, sender.id, sender.first_name, sender.last_name, profile.nickname, media.file_path, request.created_at
			FROM follow_requests request
			JOIN users sender ON sender.id = request.sender_id
			JOIN profiles profile ON profile.user_id = sender.id
			LEFT JOIN profile_avatars avatar ON avatar.user_id = sender.id
			LEFT JOIN media ON media.id = avatar.media_id
			WHERE request.recipient_id = ? AND request.status = ?
			ORDER BY request.created_at DESC
		`, currentUser.ID, int(enums.FollowRequestStatusPending))
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch follow requests")
			return
		}
		defer rows.Close()

		requests := make([]models.FollowRequestItem, 0)
		for rows.Next() {
			var item models.FollowRequestItem
			if err := rows.Scan(&item.ID, &item.SenderID, &item.FirstName, &item.LastName, &item.Nickname, &item.AvatarPath, &item.CreatedAt); err != nil {
				helpers.WriteError(w, http.StatusInternalServerError, "failed to read follow requests")
				return
			}
			if item.AvatarPath != nil {
				path := "/" + strings.TrimLeft(*item.AvatarPath, "/")
				item.AvatarPath = &path
			}
			requests = append(requests, item)
		}
		if err := rows.Err(); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to read follow requests")
			return
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{"requests": requests})
	}
}

// method: GET -- checks whether ?user_id= is a follower of the current user.
// will return: is_follower: true || false
func IsFollower(database *sql.DB) http.HandlerFunc {
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

		targetID := strings.TrimSpace(r.URL.Query().Get("user_id"))
		if targetID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
			return
		}

		// Is targetID a follower of currentUser?
		// i.e. does a row exist where follower_id = targetID AND following_id = currentUser.ID?
		var count int
		_ = database.QueryRow(`
			SELECT COUNT(*) FROM follows
			WHERE follower_id = ? AND following_id = ?
		`, targetID, currentUser.ID).Scan(&count)

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"is_follower": count > 0,
			"user_id":     targetID,
		})
	}
}

// method: GET -- checks whether the current user is following ?user_id=.
// Returns: { "is_following": true | false }
func IsFollowing(database *sql.DB) http.HandlerFunc {
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

		targetID := strings.TrimSpace(r.URL.Query().Get("user_id"))
		if targetID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
			return
		}

		// Is currentUser following targetID?
		// i.e. does a row exist where follower_id = currentUser.ID AND following_id = targetID?
		var count int
		_ = database.QueryRow(`
			SELECT COUNT(*) FROM follows
			WHERE follower_id = ? AND following_id = ?
		`, currentUser.ID, targetID).Scan(&count)

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"is_following": count > 0,
			"user_id":      targetID,
		})
	}
}

// method: POST -- unfollow a user.
// The current user must already be following the target user.
// Body: { "user_id": "<target user id>" }
func UnfollowUser(database *sql.DB) http.HandlerFunc {
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
			helpers.WriteError(w, http.StatusBadRequest, "cannot unfollow yourself")
			return
		}

		var count int
		_ = database.QueryRow(`
			SELECT COUNT(*) FROM follows
			WHERE follower_id = ? AND following_id = ?
		`, currentUser.ID, targetID).Scan(&count)

		if count == 0 {
			helpers.WriteError(w, http.StatusConflict, "you are not following this user")
			return
		}

		_, err := database.Exec(`
			DELETE FROM follows
			WHERE follower_id = ? AND following_id = ?
		`, currentUser.ID, targetID)

		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to unfollow user")
			return
		}

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message": "successfully unfollowed user",
			"user_id": targetID,
		})
	}
}
