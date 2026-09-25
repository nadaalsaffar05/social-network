package feed

import (
	"database/sql"

	"social-network/internal/chat"
)

type Handler struct {
	DB  *sql.DB
	Hub *chat.Hub
}

func NewHandler(db *sql.DB, hub *chat.Hub) *Handler {
	return &Handler{DB: db, Hub: hub}
}
