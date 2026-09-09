package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
	"strings"

	"github.com/google/uuid"
)

func (h *Handler) Groups(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetGroups(w, r)
		return
	case http.MethodPost:
		h.CreateGroup(w, r)
		return
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateGroupRequest
	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Title is required")
		return
	}

	if len([]rune(req.Title)) > 120 {
		helpers.WriteError(w, http.StatusBadRequest, "Title must be at most 120 characters long")
		return
	}

	req.Description = strings.TrimSpace(req.Description)
	if req.Description == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Description is required")
		return
	}

	if len([]rune(req.Description)) > 5000 {
		helpers.WriteError(w, http.StatusBadRequest, "Description must be at most 5000 characters long")
		return
	}

	groupID := uuid.New().String()

	groupResponse, err := createGroup(h.DB, groupID, currentUser.ID, req.Title, req.Description)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, groupResponse)
}

func (h *Handler) GetGroups(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	groups, err := getAllGroups(h.DB)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch groups")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, groups)
}

func (h *Handler) GetGroupByID(w http.ResponseWriter, r *http.Request) {
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

	group, err := getGroupByID(h.DB, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	isMember, hasPendingRequest, hasPendingInvite, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	group.IsMember = isMember
	group.HasPendingRequest = hasPendingRequest
	group.HasPendingInvite = hasPendingInvite
	helpers.WriteJSON(w, http.StatusOK, group)
}

func (h *Handler) GetGroupMembers(w http.ResponseWriter, r *http.Request) {
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

	members, err := getGroupMembers(h.DB, groupID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group members")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, members)
}
