package models

// PrivateMessage is a private message returned by the REST and WebSocket APIs.
type PrivateMessage struct {
	PublicID       string  `json:"public_id"`
	ConversationID string  `json:"conversation_id"`
	SenderID       string  `json:"sender_id"`
	RecipientID    string  `json:"recipient_id"`
	Content        string  `json:"content"`
	CreatedAt      string  `json:"created_at"`
	DeliveredAt    *string `json:"delivered_at,omitempty"`
	ReadAt         *string `json:"read_at,omitempty"`
	IsActive       bool    `json:"is_active"`
}

type SendPrivateMessageRequest struct {
	Content string `json:"content"`
}

type PrivateMessagesResponse struct {
	Messages   []PrivateMessage `json:"messages"`
	NextCursor string           `json:"next_cursor,omitempty"`
	LastSeenAt *string          `json:"last_seen_at,omitempty"`
}

type OnlineUsersResponse struct {
	UserIDs []string `json:"user_ids"`
}

type UserPresence struct {
	UserID     string  `json:"user_id"`
	IsOnline   bool    `json:"is_online"`
	LastSeenAt *string `json:"last_seen_at,omitempty"`
}

// SocketEvent is the envelope used for all messages sent over /ws.
type SocketEvent struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type TypingEvent struct {
	RecipientID string `json:"recipient_id"`
	IsTyping    bool   `json:"is_typing"`
}

type MessageStateEvent struct {
	PublicID string `json:"public_id"`
}
