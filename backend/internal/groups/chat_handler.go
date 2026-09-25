package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/chat"
	"social-network/internal/helpers"
	"social-network/internal/models"
	"strings"
)

var errInvalidCursor = errors.New("invalid cursor")

func (h *Handler) GroupMessages(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetGroupMessages(w, r)
		return
	case http.MethodPost:
		h.CreateGroupMessages(w, r)
		return
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
}

func (h *Handler) GetGroupMessages(w http.ResponseWriter, r *http.Request) {
	groupID, currentUserID, ok := h.requireActiveGroupMember(w, r, "You must be a group member to view messages")
	if !ok {
		return
	}

	limit, err := helpers.ParsePageLimit(r.URL.Query().Get("limit"), 30)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "limit must be an integer between 1 and 50")
		return
	}

	messages, nextCursor, err := getGroupMessages(h.DB, groupID, currentUserID, strings.TrimSpace(r.URL.Query().Get("cursor")), limit)
	if err != nil {
		if errors.Is(err, errInvalidCursor) {
			helpers.WriteError(w, http.StatusBadRequest, "Invalid cursor")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group messages")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, models.GroupMessagesResponse{Messages: messages, NextCursor: nextCursor})
}

func (h *Handler) CreateGroupMessages(w http.ResponseWriter, r *http.Request) {
	groupID, currentUserID, ok := h.requireActiveGroupMember(w, r, "You must be a group member to send messages")
	if !ok {
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	content, err := chat.ValidateMessageContent(req.Content)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	message, err := createGroupMessage(h.DB, groupID, currentUserID, content)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to send group message")
		return
	}

	memberIDs, err := getActiveGroupMemberIDs(h.DB, groupID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to load group members")
		return
	}

	event := models.SocketEvent{Type: "group-message:new", Data: message}

	for _, memberID := range memberIDs {
		if memberID == currentUserID {
			continue
		}
		h.Hub.SendTo(memberID, event)
	}

	helpers.WriteJSON(w, http.StatusCreated, message)
}

func (h *Handler) GroupMessageReaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groupID := strings.TrimSpace(r.PathValue("group_id"))
	publicID := strings.TrimSpace(r.PathValue("public_id"))
	if groupID == "" || publicID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Group ID and message ID are required")
		return
	}

	if _, err := getGroupByID(h.DB, groupID); err != nil {
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
	if !isMember {
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to react to messages")
		return
	}

	var request models.MessageReactionRequest
	if err := helpers.ParseJSON(r.Body, &request); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	emoji, err := chat.ValidateReactionEmoji(request.Emoji)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	found, err := setGroupMessageReaction(h.DB, groupID, currentUser.ID, publicID, emoji)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to update message reaction")
		return
	}
	if !found {
		helpers.WriteError(w, http.StatusNotFound, "Message not found")
		return
	}

	reactions, err := getGroupMessageReactions(h.DB, groupID, publicID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to load message reactions")
		return
	}

	event := newGroupMessageReactionEvent(groupID, publicID, currentUser.ID, reactions)
	h.broadcastGroupMessageReactions(groupID, publicID, reactions)
	helpers.WriteJSON(w, http.StatusOK, event)
}
