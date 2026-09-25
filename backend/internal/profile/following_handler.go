package profile

import (
	"database/sql"
	"errors"
	"io"
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/chat"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"
	"social-network/internal/notifications"

	"github.com/gofrs/uuid/v5"
)

var errFollowRequestNotPending = errors.New("follow request has already been responded to")

func GetFollowers(db *sql.DB) http.HandlerFunc {
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

		userID := strings.TrimSpace(r.URL.Query().Get("user_id"))
		if userID == "" {
			userID = currentUser.ID
		}
		followers, err := getFollowers(db, userID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch followers")
			return
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"followers": followers})
	}
}

func GetFollowing(db *sql.DB) http.HandlerFunc {
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

		userID := strings.TrimSpace(r.URL.Query().Get("user_id"))
		if userID == "" {
			userID = currentUser.ID
		}
		following, err := getFollowing(db, userID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch following")
			return
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"following": following})
	}
}

func GetFollowRequests(db *sql.DB) http.HandlerFunc {
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

		requests, err := getFollowRequests(db, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch follow requests")
			return
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"requests": requests})
	}
}

func FollowUser(db *sql.DB, hub *chat.Hub) http.HandlerFunc {
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

		targetID, err := followTargetID(r)
		if err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if targetID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
			return
		}
		if targetID == currentUser.ID {
			helpers.WriteError(w, http.StatusBadRequest, "cannot follow yourself")
			return
		}

		privacy, err := getProfilePrivacy(db, targetID)
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "target user not found")
			return
		}
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch target user")
			return
		}

		following, err := helpers.IsFollowing(db, currentUser.ID, targetID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to check follow status")
			return
		}
		if following {
			helpers.WriteError(w, http.StatusConflict, "already following this user")
			return
		}

		if privacy == enums.ProfilePrivacyPublic {
			operationError := "failed to follow user"
			if err := helpers.WithTx(db, func(tx *sql.Tx) error {
				if _, err := tx.Exec(`
					INSERT INTO follows (follower_id, following_id)
					VALUES (?, ?)
					ON CONFLICT(follower_id, following_id) DO NOTHING
				`, currentUser.ID, targetID); err != nil {
					return err
				}

				operationError = "failed to create follower notification"
				return notifications.Create(tx, notifications.CreateInput{
					RecipientID: targetID,
					ActorID:     currentUser.ID,
					Type:        enums.NotificationTypeNewFollower,
				})
			}); err != nil {
				helpers.WriteError(w, http.StatusInternalServerError, operationError)
				return
			}
			notifications.SendRealtimeEvent(hub, targetID, "notification:new")
			helpers.WriteJSON(w, http.StatusOK, map[string]any{
				"message":      "successfully followed user",
				"following_id": targetID,
				"status":       "following",
			})
			return
		}

		pendingRequestID, pending, err := getPendingFollowRequestID(db, currentUser.ID, targetID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to check follow request")
			return
		}
		if pending {
			helpers.WriteJSON(w, http.StatusOK, map[string]any{
				"message":           "follow request already pending",
				"follow_request_id": pendingRequestID,
				"status":            "pending",
			})
			return
		}

		requestUUID, err := uuid.NewV4()
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to generate request id")
			return
		}
		requestID := requestUUID.String()
		operationError := "failed to send follow request"
		if err := helpers.WithTx(db, func(tx *sql.Tx) error {
			if _, err := tx.Exec(`
				INSERT INTO follow_requests (id, sender_id, recipient_id, status)
				VALUES (?, ?, ?, ?)
			`, requestID, currentUser.ID, targetID, enums.FollowRequestStatusPending); err != nil {
				return err
			}
			operationError = "failed to create follow notification"
			return notifications.Create(tx, notifications.CreateInput{
				RecipientID:     targetID,
				ActorID:         currentUser.ID,
				Type:            enums.NotificationTypeFollowRequest,
				FollowRequestID: &requestID,
			})
		}); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, operationError)
			return
		}
		notifications.SendRealtimeEvent(hub, targetID, "follow-request:new")

		helpers.WriteJSON(w, http.StatusOK, map[string]any{
			"message":           "follow request sent",
			"follow_request_id": requestID,
			"status":            "pending",
		})
	}
}

func RespondToFollowRequest(db *sql.DB, hub *chat.Hub) http.HandlerFunc {
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

		var req models.RespondToFollowRequestRequest
		if err := helpers.ParseJSON(r.Body, &req); err != nil {
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

		senderID, recipientID, currentStatus, err := getFollowRequest(db, req.RequestID)
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "follow request not found")
			return
		}
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to fetch follow request")
			return
		}
		if recipientID != currentUser.ID {
			helpers.WriteError(w, http.StatusForbidden, "you are not the recipient of this request")
			return
		}
		if currentStatus != enums.FollowRequestStatusPending {
			helpers.WriteError(w, http.StatusConflict, "follow request has already been responded to")
			return
		}

		newStatus := enums.FollowRequestStatusDeclined
		responseStatus := "declined"
		message := "follow request declined"
		if req.Action == "accept" {
			newStatus = enums.FollowRequestStatusAccepted
			responseStatus = "accepted"
			message = "follow request accepted"
		}

		operationError := "failed to update follow request"
		if err := helpers.WithTx(db, func(tx *sql.Tx) error {
			result, err := tx.Exec(`
				UPDATE follow_requests
				SET status = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
				WHERE id = ? AND status = ?
			`, newStatus, req.RequestID, enums.FollowRequestStatusPending)
			if err != nil {
				return err
			}
			updated, err := result.RowsAffected()
			if err != nil {
				return err
			}
			if updated == 0 {
				return errFollowRequestNotPending
			}
			if newStatus != enums.FollowRequestStatusAccepted {
				return nil
			}
			operationError = "failed to create follow relationship"
			if _, err = tx.Exec(`
				INSERT INTO follows (follower_id, following_id)
				VALUES (?, ?)
				ON CONFLICT(follower_id, following_id) DO NOTHING
			`, senderID, recipientID); err != nil {
				return err
			}

			operationError = "failed to create follower notification"
			return notifications.Create(tx, notifications.CreateInput{
				RecipientID: recipientID,
				ActorID:     senderID,
				Type:        enums.NotificationTypeNewFollower,
			})
		}); err != nil {
			if errors.Is(err, errFollowRequestNotPending) {
				helpers.WriteError(w, http.StatusConflict, err.Error())
				return
			}
			helpers.WriteError(w, http.StatusInternalServerError, operationError)
			return
		}

		notifications.SendRealtimeEvent(hub, currentUser.ID, "follow-request:resolved")
		if newStatus == enums.FollowRequestStatusAccepted {
			notifications.SendRealtimeEvent(hub, currentUser.ID, "notification:new")
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"message": message, "status": responseStatus})
	}
}

func CancelFollowRequest(db *sql.DB, hub *chat.Hub) http.HandlerFunc {
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

		targetID, err := followTargetID(r)
		if err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if targetID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
			return
		}

		result, err := db.Exec(`
			DELETE FROM follow_requests
			WHERE sender_id = ? AND recipient_id = ? AND status = ?
		`, currentUser.ID, targetID, enums.FollowRequestStatusPending)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to cancel follow request")
			return
		}
		updated, err := result.RowsAffected()
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to confirm follow request cancellation")
			return
		}
		if updated == 0 {
			helpers.WriteError(w, http.StatusNotFound, "pending follow request not found")
			return
		}

		notifications.SendRealtimeEvent(hub, targetID, "notification:resolved")
		helpers.WriteJSON(w, http.StatusOK, map[string]string{"message": "follow request cancelled"})
	}
}

func IsFollower(db *sql.DB) http.HandlerFunc {
	return followStatusHandler(db, "is_follower", func(currentUserID, targetID string) (string, string) {
		return targetID, currentUserID
	})
}

func IsFollowing(db *sql.DB) http.HandlerFunc {
	return followStatusHandler(db, "is_following", func(currentUserID, targetID string) (string, string) {
		return currentUserID, targetID
	})
}

func followStatusHandler(db *sql.DB, field string, relation func(string, string) (string, string)) http.HandlerFunc {
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
		followerID, followingID := relation(currentUser.ID, targetID)
		exists, err := helpers.IsFollowing(db, followerID, followingID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to check follow status")
			return
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{field: exists, "user_id": targetID})
	}
}

func UnfollowUser(db *sql.DB) http.HandlerFunc {
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
		targetID, err := followTargetID(r)
		if err != nil {
			helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if targetID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
			return
		}
		if targetID == currentUser.ID {
			helpers.WriteError(w, http.StatusBadRequest, "cannot unfollow yourself")
			return
		}

		result, err := db.Exec(`
			DELETE FROM follows
			WHERE follower_id = ? AND following_id = ?
		`, currentUser.ID, targetID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to unfollow user")
			return
		}
		updated, err := result.RowsAffected()
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to confirm unfollow")
			return
		}
		if updated == 0 {
			helpers.WriteError(w, http.StatusConflict, "you are not following this user")
			return
		}
		helpers.WriteJSON(w, http.StatusOK, map[string]any{"message": "successfully unfollowed user", "user_id": targetID})
	}
}

func followTargetID(r *http.Request) (string, error) {
	var req models.FollowUserRequest
	err := helpers.ParseJSON(r.Body, &req)
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	if userID := strings.TrimSpace(req.UserID); userID != "" {
		return userID, nil
	}
	return strings.TrimSpace(r.URL.Query().Get("user_id")), nil
}
