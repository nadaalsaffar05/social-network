package groups

import (
	"encoding/json"
	"sort"
	"strings"
	"time"

	"social-network/internal/models"
)

const groupTypingTTL = 5 * time.Second

type groupTypingInput struct {
	GroupID  string `json:"group_id"`
	IsTyping bool   `json:"is_typing"`
}

type groupMessageReadInput struct {
	GroupID  string `json:"group_id"`
	PublicID string `json:"public_id"`
}

// HandleSocketEvent receives group events from chat's shared WebSocket.
func (h *Handler) HandleSocketEvent(userID, eventType string, data json.RawMessage) {
	switch eventType {
	case "group-typing":
		h.handleGroupTyping(userID, data)
	case "group-message:read":
		h.handleGroupMessageRead(userID, data)
	}
}

func (h *Handler) handleGroupTyping(userID string, data json.RawMessage) {
	var input groupTypingInput
	if json.Unmarshal(data, &input) != nil {
		return
	}
	input.GroupID = strings.TrimSpace(input.GroupID)
	if input.GroupID == "" {
		return
	}

	isMember, _, _, _, err := getGroupUserState(h.DB, input.GroupID, userID)
	if err != nil || !isMember {
		return
	}

	deadline, changed := h.setGroupTyping(input.GroupID, userID, input.IsTyping)
	if !changed {
		return
	}
	h.broadcastGroupTyping(input.GroupID)
	if input.IsTyping {
		time.AfterFunc(time.Until(deadline), func() {
			if h.clearExpiredGroupTyping(input.GroupID, userID, deadline) {
				h.broadcastGroupTyping(input.GroupID)
			}
		})
	}
}

func (h *Handler) handleGroupMessageRead(userID string, data json.RawMessage) {
	var input groupMessageReadInput
	if json.Unmarshal(data, &input) != nil {
		return
	}
	input.GroupID = strings.TrimSpace(input.GroupID)
	input.PublicID = strings.TrimSpace(input.PublicID)
	if input.GroupID == "" || input.PublicID == "" {
		return
	}

	isMember, _, _, _, err := getGroupUserState(h.DB, input.GroupID, userID)
	if err != nil || !isMember {
		return
	}

	event, updated, err := markGroupMessageRead(h.DB, input.GroupID, userID, input.PublicID)
	if err != nil || !updated {
		return
	}

	memberIDs, err := getActiveGroupMemberIDs(h.DB, input.GroupID)
	if err != nil {
		return
	}
	for _, memberID := range memberIDs {
		h.Hub.SendTo(memberID, models.SocketEvent{Type: "group-message:read", Data: event})
	}
}

func (h *Handler) setGroupTyping(groupID, userID string, isTyping bool) (time.Time, bool) {
	h.typingMu.Lock()
	defer h.typingMu.Unlock()

	users := h.typing[groupID]
	if !isTyping {
		if _, found := users[userID]; !found {
			return time.Time{}, false
		}
		delete(users, userID)
		if len(users) == 0 {
			delete(h.typing, groupID)
		}
		return time.Time{}, true
	}

	if users == nil {
		users = make(map[string]time.Time)
		h.typing[groupID] = users
	}
	deadline := time.Now().Add(groupTypingTTL)
	users[userID] = deadline
	return deadline, true
}

func (h *Handler) clearExpiredGroupTyping(groupID, userID string, deadline time.Time) bool {
	h.typingMu.Lock()
	defer h.typingMu.Unlock()

	users := h.typing[groupID]
	if users == nil || !users[userID].Equal(deadline) {
		return false
	}
	delete(users, userID)
	if len(users) == 0 {
		delete(h.typing, groupID)
	}
	return true
}

// HandleSocketDisconnect clears typing state only after a user's last socket closes.
func (h *Handler) HandleSocketDisconnect(userID string) {
	h.typingMu.Lock()
	groupIDs := make([]string, 0)
	for groupID, users := range h.typing {
		if _, found := users[userID]; !found {
			continue
		}
		delete(users, userID)
		if len(users) == 0 {
			delete(h.typing, groupID)
		}
		groupIDs = append(groupIDs, groupID)
	}
	h.typingMu.Unlock()

	for _, groupID := range groupIDs {
		h.broadcastGroupTyping(groupID)
	}
}

func (h *Handler) broadcastGroupTyping(groupID string) {
	h.typingMu.Lock()
	userIDs := make([]string, 0, len(h.typing[groupID]))
	for userID, deadline := range h.typing[groupID] {
		if time.Now().Before(deadline) {
			userIDs = append(userIDs, userID)
		}
	}
	h.typingMu.Unlock()
	sort.Strings(userIDs)

	typers, err := getActiveGroupChatUsers(h.DB, groupID, userIDs)
	if err != nil {
		return
	}
	memberIDs, err := getActiveGroupMemberIDs(h.DB, groupID)
	if err != nil {
		return
	}
	event := models.SocketEvent{
		Type: "group-typing",
		Data: models.GroupTypingEvent{
			GroupID:     groupID,
			TypingCount: len(typers),
			Typers:      typers,
		},
	}
	for _, memberID := range memberIDs {
		h.Hub.SendTo(memberID, event)
	}
}

func (h *Handler) broadcastGroupMessageReactions(groupID, publicID string, reactions []models.MessageReaction) {
	memberIDs, err := getActiveGroupMemberIDs(h.DB, groupID)
	if err != nil {
		return
	}

	for _, memberID := range memberIDs {
		h.Hub.SendTo(memberID, models.SocketEvent{
			Type: "group-message:reaction",
			Data: newGroupMessageReactionEvent(groupID, publicID, memberID, reactions),
		})
	}
}
