package chat

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

type Handler struct {
	DB  *sql.DB
	Hub *Hub
}

func NewHandler(db *sql.DB, hub *Hub) *Handler {
	return &Handler{DB: db, Hub: hub}
}

func (h *Handler) Messages(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.getMessages(w, r)
	case http.MethodPost:
		h.createMessage(w, r)
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) Message(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	deleted, err := softDeletePrivateMessage(
		h.DB,
		currentUser.ID,
		r.PathValue("user_id"),
		r.PathValue("public_id"),
	)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not delete message")
		return
	}
	if !deleted {
		helpers.WriteError(w, http.StatusNotFound, "message not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) getMessages(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	otherUserID := strings.TrimSpace(r.PathValue("user_id"))
	if otherUserID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
		return
	}

	limit, err := messagesLimit(r.URL.Query().Get("limit"))
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "limit must be an integer between 1 and 50")
		return
	}

	messages, nextCursor, err := getPrivateMessages(h.DB, currentUser.ID, otherUserID, strings.TrimSpace(r.URL.Query().Get("cursor")), limit)
	if errors.Is(err, errUserNotFound) {
		helpers.WriteError(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil && err.Error() == "invalid cursor" {
		helpers.WriteError(w, http.StatusBadRequest, "invalid cursor")
		return
	}
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not load messages")
		return
	}

	lastSeenAt, err := getUserLastSeen(h.DB, otherUserID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not load user presence")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, models.PrivateMessagesResponse{
		Messages:   messages,
		NextCursor: nextCursor,
		LastSeenAt: lastSeenAt,
	})
}

func (h *Handler) createMessage(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	otherUserID := strings.TrimSpace(r.PathValue("user_id"))
	if otherUserID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
		return
	}

	var request models.SendPrivateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	content, err := validateMessageContent(request.Content)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	message, err := createPrivateMessage(h.DB, currentUser.ID, otherUserID, content)
	if errors.Is(err, errUserNotFound) {
		helpers.WriteError(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil && err.Error() == "cannot message yourself" {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not send message")
		return
	}

	h.Hub.SendTo(otherUserID, models.SocketEvent{
		Type: "message:new",
		Data: message,
	})

	helpers.WriteJSON(w, http.StatusCreated, message)
}

func messagesLimit(value string) (int, error) {
	if value == "" {
		return 30, nil
	}

	limit, err := strconv.Atoi(value)
	if err != nil || limit < 1 || limit > 50 {
		return 0, errors.New("invalid limit")
	}
	return limit, nil
}
