package groups

import (
	"database/sql"
	"social-network/internal/chat"
	"sync"
	"time"
)

type Handler struct {
	DB       *sql.DB
	Hub      *chat.Hub
	typing   map[string]map[string]time.Time
	typingMu sync.Mutex
}

func NewHandler(db *sql.DB, hub *chat.Hub) *Handler {
	return &Handler{
		DB:     db,
		Hub:    hub,
		typing: make(map[string]map[string]time.Time),
	}
}
