package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/helpers"
)

// requireActiveGroupMember validates the common access rule for group content.
// It keeps endpoint-specific forbidden messages while centralizing the shared
// authentication, group existence, and active-membership checks.
func (h *Handler) requireActiveGroupMember(w http.ResponseWriter, r *http.Request, forbiddenMessage string) (groupID, userID string, ok bool) {
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return "", "", false
	}

	groupID = strings.TrimSpace(r.PathValue("group_id"))
	if groupID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "Group ID is required")
		return "", "", false
	}

	if _, err := getGroupByID(h.DB, groupID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusNotFound, "Group not found")
		} else {
			helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group")
		}
		return "", "", false
	}

	isMember, _, _, err := getGroupUserState(h.DB, groupID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to check group membership")
		return "", "", false
	}
	if !isMember {
		helpers.WriteError(w, http.StatusForbidden, forbiddenMessage)
		return "", "", false
	}

	return groupID, currentUser.ID, true
}
