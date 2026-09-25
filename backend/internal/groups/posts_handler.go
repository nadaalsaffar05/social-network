package groups

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"social-network/internal/feed"
	"social-network/internal/helpers"

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
	groupID, currentUserID, ok := h.requireActiveGroupMember(w, r, "You must be a group member to view posts")
	if !ok {
		return
	}

	limit, err := helpers.ParsePageLimit(r.URL.Query().Get("limit"), 10)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "Limit must be an integer between 1 and 50")
		return
	}

	posts, nextCursor, err := getGroupPosts(h.DB, groupID, currentUserID, strings.TrimSpace(r.URL.Query().Get("cursor")), limit)
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
	groupID, currentUserID, ok := h.requireActiveGroupMember(w, r, "You must be a group member to create posts")
	if !ok {
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
	err = createGroupPost(h.DB, postID, currentUserID, groupID, req.Content)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "Failed to create group post")
		return
	}

	post, found, err := feed.GetPostForViewer(h.DB, postID, currentUserID)
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
