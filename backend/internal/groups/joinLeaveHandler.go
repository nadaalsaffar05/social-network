package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/notifications"

	"github.com/google/uuid"
)

func (h *Handler) JoinGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID := r.PathValue("group_id")
	if groupID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	group, err := getGroupByID(h.DB, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	isMember, hasPendingRequest, hasPendingInvite, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	if isMember {
		helpers.WriteError(w, http.StatusConflict, "User is already a member of the group")
		return
	}

	if hasPendingRequest {
		helpers.WriteError(w, http.StatusConflict, "User already has a pending join request for this group")
		return
	}

	if hasPendingInvite {
		helpers.WriteError(w, http.StatusConflict, "User already has a pending invitation for this group")
		return
	}

	joinRequestID := uuid.New().String()
	tx, err := h.DB.Begin()
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to start join request")
		return
	}
	defer tx.Rollback()

	err = createJoinRequest(tx, joinRequestID, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to create join request")
		return
	}
	if err := notifications.Create(tx, notifications.CreateInput{
		RecipientID:        group.CreatorID,
		ActorID:            currentUser.ID,
		Type:               enums.NotificationTypeGroupJoinRequest,
		GroupJoinRequestID: &joinRequestID,
	}); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to create join request notification")
		return
	}
	if err := tx.Commit(); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to create join request")
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, map[string]string{"message": "Join request created successfully"})
}

func (h *Handler) LeaveGroup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID := r.PathValue("group_id")
	if groupID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	group, err := getGroupByID(h.DB, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	if group.CreatorID == currentUser.ID {
		helpers.WriteError(w, http.StatusForbidden, "Group creator cannot leave the group")
		return
	}

	isMember, _, _, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	if !isMember {
		helpers.WriteError(w, http.StatusNotFound, "User is not a member of the group")
		return
	}

	rowsAffected, err := markRemoved(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to leave group")
		return
	}

	if rowsAffected == 0 {
		helpers.WriteError(w, http.StatusNotFound, "Active group membership not found")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]string{"message": "Successfully left the group"})
}

func (h *Handler) GetJoinRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID := r.PathValue("group_id")
	if groupID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	group, err := getGroupByID(h.DB, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	if group.CreatorID != currentUser.ID {
		helpers.WriteError(w, http.StatusForbidden, "Only the group creator can view join requests")
		return
	}

	joinRequests, err := getJoinRequests(h.DB, groupID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch join requests")
		return
	}
	helpers.WriteJSON(w, http.StatusOK, joinRequests)
}

func (h *Handler) RespondToJoinRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID := r.PathValue("group_id")
	if groupID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	requestID := r.PathValue("request_id")
	if requestID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Request ID is required")
		return
	}

	var req struct {
		Action string `json:"action"`
	}

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Action != "accept" && req.Action != "decline" {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid action. Must be 'accept' or 'decline'")
		return
	}

	group, err := getGroupByID(h.DB, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	if group.CreatorID != currentUser.ID {
		helpers.WriteError(w, http.StatusForbidden, "Only the group creator can respond to join requests")
		return
	}

	joinRequest, err := getPendingJoinRequestByID(h.DB, groupID, requestID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Join request not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch join request")
		return
	}

	err = respondToJoinRequest(h.DB, req.Action, joinRequest)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to respond to join request")
		return
	}
	helpers.WriteJSON(w, http.StatusOK, map[string]string{"message": "Successfully responded to join request", "new_status": string(req.Action)})
}

func (h *Handler) CancelJoinRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID := r.PathValue("group_id")
	if groupID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return
	}

	rowsAffected, err := cancelJoinRequest(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to cancel join request")
		return
	}

	if rowsAffected == 0 {
		helpers.WriteError(w, http.StatusNotFound, "No pending join request found")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]string{"message": "Join request cancelled"})
}
