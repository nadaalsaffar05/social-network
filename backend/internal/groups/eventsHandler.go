package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/notifications"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (h *Handler) Events(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetAllEvents(w, r)
		return
	case http.MethodPost:
		h.CreateEvent(w, r)
		return
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
}

func (h *Handler) CreateEvent(w http.ResponseWriter, r *http.Request) {
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

	_, err := getGroupByID(h.DB, groupID)
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

	if !isMember {
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to create an event")
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		StartsAt    string `json:"starts_at"`
	}

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.StartsAt = strings.TrimSpace(req.StartsAt)

	if req.Title == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Event title is required")
		return
	}

	if len([]rune(req.Title)) > 200 {
		helpers.WriteError(w, http.StatusBadRequest, "Event title cannot exceed 200 characters")
		return
	}

	if len([]rune(req.Description)) > 5000 {
		helpers.WriteError(w, http.StatusBadRequest, "Event description cannot exceed 5000 characters")
		return
	}

	startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid event start time")
		return
	}

	if !startsAt.After(time.Now()) {
		helpers.WriteError(w, http.StatusBadRequest, "Event must start in the future")
		return
	}

	eventID := uuid.New().String()
	operationError := "Failed to start event"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		operationError = "Failed to create event"
		if err := createEvent(tx, eventID, groupID, currentUser.ID, req.Title, req.Description, req.StartsAt); err != nil {
			return err
		}

		operationError = "Failed to load group members"
		members, err := getActiveGroupMemberIDs(tx, groupID)
		if err != nil {
			return err
		}

		operationError = "Failed to create event notifications"
		for _, memberID := range members {
			if memberID == currentUser.ID {
				continue
			}
			if err := notifications.Create(tx, notifications.CreateInput{
				RecipientID:  memberID,
				ActorID:      currentUser.ID,
				Type:         enums.NotificationTypeEventCreated,
				GroupEventID: &eventID,
			}); err != nil {
				return err
			}
		}

		operationError = "Failed to create event"
		return nil
	}); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, operationError)
		return
	}

	event, err := getEventByID(h.DB, groupID, eventID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Event not found")
			return
		}

		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch event")
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, event)
}

func (h *Handler) GetAllEvents(w http.ResponseWriter, r *http.Request) {
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

	_, err := getGroupByID(h.DB, groupID)
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

	if !isMember {
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to view events")
		return
	}

	events, err := getAllActiveEvents(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch events")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, events)
}

func (h *Handler) GetEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
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

	eventID := r.PathValue("event_id")
	if eventID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Event ID is required")
		return
	}

	_, err := getGroupByID(h.DB, groupID)
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

	if !isMember {
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to view events")
		return
	}

	event, err := getEventByID(h.DB, groupID, eventID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Event not found")
			return
		}

		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch event")
		return
	}

	response, hasResponded, err := getEventResponse(h.DB, eventID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch event response")
		return
	}

	if hasResponded {
		event.MyResponse = &response
	}

	helpers.WriteJSON(w, http.StatusOK, event)
}

func (h *Handler) RespondToEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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

	eventID := r.PathValue("event_id")
	if eventID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Event ID is required")
		return
	}

	var req struct {
		Action string `json:"action"`
	}

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Action != "going" && req.Action != "not_going" {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid action. Must be 'going' or 'not_going'")
		return
	}

	_, err := getGroupByID(h.DB, groupID)
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

	if !isMember {
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to respond to events")
		return
	}

	event, err := getEventByID(h.DB, groupID, eventID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Event not found")
			return
		}

		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch event")
		return
	}

	startsAt, err := time.Parse(time.RFC3339, event.StartsAt)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Invalid event start time")
		return
	}

	if !startsAt.After(time.Now()) {
		helpers.WriteError(w, http.StatusConflict, "Cannot respond to a past event")
		return
	}

	if event.CreatorID == currentUser.ID {
		helpers.WriteError(w, http.StatusForbidden, "Event creator cannot respond to their own event")
		return
	}

	err = respondToEvent(h.DB, req.Action, groupID, eventID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to respond to event")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]string{"message": "Successfully responded to event", "new_response": req.Action})
}
