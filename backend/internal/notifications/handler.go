package notifications

import (
	"database/sql"
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

func (h *Handler) Notifications(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	notifications, unreadCount, err := list(h.DB, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "failed to load notifications")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, models.NotificationsResponse{
		Notifications: notifications,
		UnreadCount:   unreadCount,
	})
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	notificationID := strings.TrimSpace(r.PathValue("notification_id"))
	if notificationID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "notification_id is required")
		return
	}

	updated, err := markRead(h.DB, currentUser.ID, notificationID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "failed to mark notification as read")
		return
	}
	if !updated {
		helpers.WriteError(w, http.StatusNotFound, "notification not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := markAllRead(h.DB, currentUser.ID); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "failed to mark notifications as read")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
