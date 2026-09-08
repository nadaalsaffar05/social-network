package models

// PrivateMessage is a private message returned by the REST and WebSocket APIs.
type PrivateMessage struct {
	PublicID       string            `json:"public_id"`
	ConversationID string            `json:"conversation_id"`
	SenderID       string            `json:"sender_id"`
	RecipientID    string            `json:"recipient_id"`
	Content        string            `json:"content"`
	CreatedAt      string            `json:"created_at"`
	DeliveredAt    *string           `json:"delivered_at,omitempty"`
	ReadAt         *string           `json:"read_at,omitempty"`
	IsActive       bool              `json:"is_active"`
	Reactions      []MessageReaction `json:"reactions,omitempty"`
}

type MessageReaction struct {
	Emoji  string `json:"emoji"`
	UserID string `json:"user_id"`
}

type MessageReactionRequest struct {
	Emoji string `json:"emoji"`
}

type SendPrivateMessageRequest struct {
	Content string `json:"content"`
}

type PrivateMessagesResponse struct {
	Messages   []PrivateMessage `json:"messages"`
	NextCursor string           `json:"next_cursor,omitempty"`
	LastSeenAt *string          `json:"last_seen_at,omitempty"`
}

type MessageRequestResponse struct {
	ConversationID string          `json:"conversation_id"`
	RequesterID    string          `json:"requester_id"`
	RecipientID    string          `json:"recipient_id"`
	Status         string          `json:"status"`
	CreatedAt      string          `json:"created_at"`
	Message        *PrivateMessage `json:"message,omitempty"`
	Requester      *ChatUser       `json:"requester,omitempty"`
}

// ChatUser is the public identity shown in the messages inbox.
type ChatUser struct {
	ID         string  `json:"id"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	Nickname   *string `json:"nickname,omitempty"`
	AvatarPath *string `json:"avatar_path,omitempty"`
}

type ConversationSummary struct {
	ConversationID    string   `json:"conversation_id"`
	User              ChatUser `json:"user"`
	LastMessage       string   `json:"last_message"`
	LastMessageAt     string   `json:"last_message_at"`
	RequestStatus     string   `json:"request_status"`
	IsIncomingRequest bool     `json:"is_incoming_request"`
}

type OnlineUsersResponse struct {
	UserIDs []string     `json:"user_ids"`
	Users   []OnlineUser `json:"users"`
}

type OnlineUser struct {
	ID         string  `json:"id"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	Nickname   *string `json:"nickname,omitempty"`
	AvatarPath *string `json:"avatar_path,omitempty"`
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
	SenderID    string `json:"sender_id,omitempty"`
	RecipientID string `json:"recipient_id"`
	IsTyping    bool   `json:"is_typing"`
}

type MessageStateEvent struct {
	PublicID string `json:"public_id"`
}
