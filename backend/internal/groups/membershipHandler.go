package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/helpers"

	"github.com/google/uuid"
)

func (h *Handler) JoinGroup(w http.ResponseWriter, r *http.Request) {
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

	_, err := getGroupByID(h.DB, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
			return
		}
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		return
	}

	isMember, hasPendingRequest, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return
	}

	if isMember {
		helpers.WriteError(w, http.StatusConflict, "User is already a member of the group")
		return
	}

	if hasPendingRequest {
		helpers.WriteError(w, http.StatusConflict, "User already has a pending join request for this group")
		return
	}

	joinRequestID := uuid.New().String()
	err = createJoinRequest(h.DB, joinRequestID, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusConflict, "Failed to create join request")
		return
	}
}
