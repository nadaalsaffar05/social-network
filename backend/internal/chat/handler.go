package chat

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

type incomingSocketEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type Handler struct {
	DB                           *sql.DB
	Hub                          *Hub
	groupSocketEventHandler      func(string, string, json.RawMessage)
	groupSocketDisconnectHandler func(string)
}

func NewHandler(db *sql.DB, hub *Hub) *Handler {
	return &Handler{DB: db, Hub: hub}
}

// SetGroupSocketHandlers lets the groups package reuse the single WebSocket
// connection without creating an import cycle between chat and groups.
func (h *Handler) SetGroupSocketHandlers(
	eventHandler func(string, string, json.RawMessage),
	disconnectHandler func(string),
) {
	h.groupSocketEventHandler = eventHandler
	h.groupSocketDisconnectHandler = disconnectHandler
}

func (h *Handler) OnlineUsers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	users, err := h.onlineFriends(currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not load online users")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, models.OnlineUsersResponse{UserIDs: onlineUserIDs(users), Users: users})
}

func (h *Handler) onlineFriends(userID string) ([]models.OnlineUser, error) {
	return getOnlineUsers(h.DB, userID, h.Hub.OnlineUserIDs())
}

func (h *Handler) sendPresenceUpdate(presence models.UserPresence) {
	friends, err := h.onlineFriends(presence.UserID)
	if err != nil {
		return
	}

	event := models.SocketEvent{Type: "presence:update", Data: presence}
	for _, friend := range friends {
		h.Hub.SendTo(friend.ID, event)
	}
}

func onlineUserIDs(users []models.OnlineUser) []string {
	userIDs := make([]string, 0, len(users))
	for _, user := range users {
		userIDs = append(userIDs, user.ID)
	}
	return userIDs
}

func (h *Handler) Conversations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	conversations, err := getConversations(h.DB, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not load conversations")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]any{"conversations": conversations})
}

func (h *Handler) MessageRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	requesterID := strings.TrimSpace(r.PathValue("user_id"))
	if requesterID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "user_id is required")
		return
	}

	status := messageRequestStatusAccepted
	eventType := "message-request:accepted"
	if r.Method == http.MethodDelete {
		status = messageRequestStatusDeclined
		eventType = "message-request:declined"
	}

	request, found, err := respondToMessageRequest(h.DB, currentUser.ID, requesterID, status)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not update message request")
		return
	}
	if !found {
		helpers.WriteError(w, http.StatusNotFound, "message request not found")
		return
	}

	h.Hub.SendTo(requesterID, models.SocketEvent{Type: eventType, Data: request})
	helpers.WriteJSON(w, http.StatusOK, request)
}

func (h *Handler) MessageRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	requests, err := getMessageRequests(h.DB, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not load message requests")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]any{"requests": requests})
}

func (h *Handler) WebSocket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	conn, err := websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &socketClient{conn: conn, send: make(chan models.SocketEvent, maxPendingEvents)}
	becameOnline := h.Hub.add(currentUser.ID, client)
	go client.writePump()
	defer func() {
		if h.Hub.remove(currentUser.ID, client) {
			if h.groupSocketDisconnectHandler != nil {
				h.groupSocketDisconnectHandler(currentUser.ID)
			}
			lastSeenAt, _ := updateLastSeen(h.DB, currentUser.ID)
			h.sendPresenceUpdate(models.UserPresence{UserID: currentUser.ID, IsOnline: false, LastSeenAt: lastSeenAt})
		}
	}()

	conn.SetReadLimit(socketReadLimit)
	_ = conn.SetReadDeadline(time.Now().Add(socketPongWait))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(socketPongWait))
	})

	// The new tab receives its online friends, then those friends see the change.
	onlineFriends, err := h.onlineFriends(currentUser.ID)
	if err != nil {
		onlineFriends = []models.OnlineUser{}
	}
	h.Hub.SendTo(currentUser.ID, models.SocketEvent{
		Type: "presence:sync",
		Data: models.OnlineUsersResponse{UserIDs: onlineUserIDs(onlineFriends), Users: onlineFriends},
	})
	if becameOnline {
		h.sendPresenceUpdate(models.UserPresence{UserID: currentUser.ID, IsOnline: true})
	}

	for {
		_, payload, err := conn.ReadMessage()
		if err != nil {
			return
		}
		h.handleSocketEvent(currentUser.ID, payload)
	}
}

func (h *Handler) handleSocketEvent(userID string, payload []byte) {
	var event incomingSocketEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return
	}

	switch event.Type {
	case "typing":
		var typing models.TypingEvent
		if json.Unmarshal(event.Data, &typing) != nil || typing.RecipientID == "" || typing.RecipientID == userID {
			return
		}
		if _, found, err := findConversation(h.DB, userID, typing.RecipientID); err != nil || !found {
			return
		}
		typing.SenderID = userID
		h.Hub.SendTo(typing.RecipientID, models.SocketEvent{Type: "typing", Data: typing})

	case "message:delivered":
		h.updateMessageDelivery(userID, event.Data)

	case "message:read":
		h.updateMessageRead(userID, event.Data)

	case "message:deleted":
		h.deleteMessageFromSocket(userID, event.Data)

	default:
		if strings.HasPrefix(event.Type, "group-") && h.groupSocketEventHandler != nil {
			h.groupSocketEventHandler(userID, event.Type, event.Data)
		}
	}
}

func (h *Handler) updateMessageDelivery(recipientID string, payload json.RawMessage) {
	var event models.MessageStateEvent
	if json.Unmarshal(payload, &event) != nil || event.PublicID == "" {
		return
	}

	senderID, updated, err := markMessageDelivered(h.DB, recipientID, event.PublicID)
	if err == nil && updated {
		h.Hub.SendTo(senderID, models.SocketEvent{Type: "message:delivered", Data: event})
	}
}

func (h *Handler) updateMessageRead(recipientID string, payload json.RawMessage) {
	var event models.MessageStateEvent
	if json.Unmarshal(payload, &event) != nil || event.PublicID == "" {
		return
	}

	senderID, updated, err := markMessageRead(h.DB, recipientID, event.PublicID)
	if err == nil && updated {
		h.Hub.SendTo(senderID, models.SocketEvent{Type: "message:read", Data: event})
	}
}

func (h *Handler) deleteMessageFromSocket(senderID string, payload json.RawMessage) {
	var event models.MessageStateEvent
	if json.Unmarshal(payload, &event) != nil || event.PublicID == "" {
		return
	}

	recipientID, deleted, err := softDeletePrivateMessageByPublicID(h.DB, senderID, event.PublicID)
	if err != nil || !deleted {
		return
	}

	deletedEvent := models.SocketEvent{Type: "message:deleted", Data: event}
	h.Hub.SendTo(senderID, deletedEvent)
	h.Hub.SendTo(recipientID, deletedEvent)
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

	recipientID, deleted, err := softDeletePrivateMessage(
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

	deletedEvent := models.SocketEvent{Type: "message:deleted", Data: models.MessageStateEvent{PublicID: r.PathValue("public_id")}}
	h.Hub.SendTo(currentUser.ID, deletedEvent)
	h.Hub.SendTo(recipientID, deletedEvent)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) MessageReaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var request models.MessageReactionRequest
	if err := helpers.ParseJSON(r.Body, &request); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	otherUserID, publicID := strings.TrimSpace(r.PathValue("user_id")), strings.TrimSpace(r.PathValue("public_id"))
	reactions, found, err := setMessageReaction(h.DB, currentUser.ID, otherUserID, publicID, request.Emoji)
	if err != nil {
		if errors.Is(err, errInvalidReactionEmoji) {
			helpers.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, errUserNotFound) {
			helpers.WriteError(w, http.StatusNotFound, "user not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "failed to update message reaction")
		return
	}
	if !found {
		helpers.WriteError(w, http.StatusNotFound, "message not found")
		return
	}
	event := models.SocketEvent{Type: "message:reaction", Data: map[string]any{"public_id": publicID, "reactions": reactions}}
	h.Hub.SendTo(currentUser.ID, event)
	h.Hub.SendTo(otherUserID, event)
	helpers.WriteJSON(w, http.StatusOK, map[string]any{"public_id": publicID, "reactions": reactions})
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

	limit, err := MessagesLimit(r.URL.Query().Get("limit"))
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "limit must be an integer between 1 and 50")
		return
	}

	messages, nextCursor, err := getPrivateMessages(h.DB, currentUser.ID, otherUserID, strings.TrimSpace(r.URL.Query().Get("cursor")), limit)
	if errors.Is(err, errUserNotFound) {
		helpers.WriteError(w, http.StatusNotFound, "user not found")
		return
	}
	if errors.Is(err, errInvalidCursor) {
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
	if err := helpers.ParseJSON(r.Body, &request); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	content, err := ValidateMessageContent(request.Content)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	message, err := createPrivateMessage(h.DB, currentUser.ID, otherUserID, content)
	if errors.Is(err, errUserNotFound) {
		helpers.WriteError(w, http.StatusNotFound, "user not found")
		return
	}
	if errors.Is(err, errCannotMessageSelf) {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	if errors.Is(err, errMessageRequestOpen) || errors.Is(err, errMessageRequestDeclined) {
		helpers.WriteError(w, http.StatusConflict, err.Error())
		return
	}
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not send message")
		return
	}

	eventType := "message:new"
	if pending, err := isPendingMessageRequest(h.DB, message.ConversationID); err == nil && pending {
		eventType = "message-request:new"
	}
	h.Hub.SendTo(otherUserID, models.SocketEvent{Type: eventType, Data: message})

	helpers.WriteJSON(w, http.StatusCreated, message)
}

func MessagesLimit(value string) (int, error) {
	if value == "" {
		return 30, nil
	}

	limit, err := strconv.Atoi(value)
	if err != nil || limit < 1 || limit > 50 {
		return 0, errors.New("invalid limit")
	}
	return limit, nil
}
