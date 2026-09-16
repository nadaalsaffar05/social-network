package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/feed"
	"social-network/internal/helpers"
	"strings"

	"github.com/google/uuid"
)

func (h *Handler) Posts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetGroupPosts(w, r)
	case http.MethodPost:
		h.CreateGroupPost(w, r)
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (h *Handler) GetGroupPosts(w http.ResponseWriter, r *http.Request) {
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
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to view posts")
		return
	}

	limit, err := feed.FeedLimit(r.URL.Query().Get("limit"))
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Limit must be an integer between 1 and 50")
		return
	}

	posts, nextCursor, err := getGroupPosts(h.DB, groupID, currentUser.ID, strings.TrimSpace(r.URL.Query().Get("cursor")), limit)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			helpers.WriteError(w, http.StatusBadRequest, "Invalid cursor")
			return
		}

		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group posts")
		return
	}
	if err := feed.AttachPostMedia(h.DB, posts); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch group post media")
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]any{"posts": posts, "next_cursor": nextCursor})
}

func (h *Handler) CreateGroupPost(w http.ResponseWriter, r *http.Request) {
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
		helpers.WriteError(w, http.StatusForbidden, "You must be a group member to create posts")
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	content, err := feed.NormalizePostContent(req.Content)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	req.Content = content

	postID := uuid.New().String()
	err = createGroupPost(h.DB, postID, currentUser.ID, groupID, req.Content)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to create group post")
		return
	}

	post, found, err := feed.GetPostForViewer(h.DB, postID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch created post")
		return
	}

	if !found {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to fetch created post")
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, post)
}
