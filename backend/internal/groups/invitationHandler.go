package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/helpers"

	"github.com/google/uuid"
)

func (h *Handler) Invites(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetGroupInvites(w, r)
		return
	case http.MethodPost:
		h.InviteUser(w, r)
		return
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
}

func (h *Handler) InviteUser(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		InvitedUserID string `json:"invited_user_id"`
	}

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	invitedUser, err := auth.GetUserByID(h.DB, req.InvitedUserID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}

	if invitedUser == nil {
		helpers.WriteError(w, http.StatusNotFound, "User not found")
		return
	}

	if invitedUser.ID == currentUser.ID {
		helpers.WriteError(w, http.StatusForbidden, "Cannot invite yourself")
		return
	}

	groupID := r.PathValue("group_id")

	_, err = getGroupByID(h.DB, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	isUserMember, _, _, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	if !isUserMember {
		helpers.WriteError(w, http.StatusForbidden, "Cannot invite a user to a group you are not in")
		return
	}

	isInvitedUserMember, hasPendingRequest, hasPendingInvite, err := getGroupUserState(h.DB, groupID, req.InvitedUserID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	if isInvitedUserMember {
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

	inviteID := uuid.New().String()
	err = createInvite(h.DB, inviteID, groupID, currentUser.ID, invitedUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to create invite")
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, map[string]string{"message": "Successfully invited user", "invitedUser": string(invitedUser.ID)})
}

func (h *Handler) GetUserInvites(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	invites, err := getUserInvites(h.DB, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch invites")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, invites)
}

func (h *Handler) RespondToInvite(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	inviteID := r.PathValue("invite_id")
	if inviteID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Invite ID is required")
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
		helpers.WriteError(w, http.StatusBadRequest, "Action must be accept or decline")
		return
	}

	invite, err := getPendingInviteByIDForUser(h.DB, inviteID, currentUser.ID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Pending invite not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch invite")
		return
	}

	err = respondToInvite(h.DB, req.Action, invite)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to respond to invite")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]string{"message": "Invite response updated"})
}

func (h *Handler) GetGroupInvites(w http.ResponseWriter, r *http.Request) {
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
	if errors.Is(err, sql.ErrNoRows) {
		helpers.WriteError(w, http.StatusNotFound, "Group not found")
		return
	}

	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	isMember, _, _, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	if !isMember {
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to see invites")
		return
	}

	isCreator := group.CreatorID == currentUser.ID

	invites, err := getGroupInvites(h.DB, groupID, currentUser.ID, isCreator)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group invites")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, invites)
}

func (h *Handler) CancelInvite(w http.ResponseWriter, r *http.Request) {
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
	inviteID := r.PathValue("invite_id")
	if inviteID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Invite ID is required")
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

	isMember, _, _, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	invite, err := getPendingInviteByID(h.DB, inviteID, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Pending invite not found")
			return
		}

		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch invite")
		return
	}

	isCreator := group.CreatorID == currentUser.ID
	isInviter := invite.InviterID == currentUser.ID
	if !isCreator && !(isMember && isInviter) {
		helpers.WriteError(w, http.StatusForbidden, "You cannot cancel this invite")
		return
	}

	err = cancelInvite(h.DB, inviteID, groupID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to cancel invite")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]string{"message": "Invite cancelled"})
}
