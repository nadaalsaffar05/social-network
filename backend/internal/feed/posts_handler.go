package feed

import (
	"database/sql"
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/google/uuid"
)

func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.CreatePostRequest

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	content, err := NormalizePostContent(req.Content)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}
	req.Content = content

	if !isValidPrivacy(req.Privacy) {
		helpers.WriteError(w, http.StatusBadRequest, "invalid privacy")
		return
	}

	if req.Privacy != enums.PostPrivacySelected && len(req.SelectedUserIDs) > 0 {
		helpers.WriteError(w, http.StatusBadRequest, "selected users are only allowed for selected privacy")
		return
	}

	selectedUserIDs := helpers.UniqueIDs(req.SelectedUserIDs)

	if req.Privacy == enums.PostPrivacySelected && len(selectedUserIDs) == 0 {
		helpers.WriteError(w, http.StatusBadRequest, "at least one selected user is required")
		return
	}

	for _, userID := range selectedUserIDs {
		follows, err := helpers.IsFollowing(h.DB, userID, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to check selected users")
			return
		}

		if !follows {
			helpers.WriteError(w, http.StatusBadRequest, "all selected users must follow you")
			return
		}
	}

	postID := uuid.New().String()
	var createdAt string
	operationError := "could not start transaction"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		operationError = "could not create post"
		var err error
		createdAt, err = createPost(
			tx,
			postID,
			currentUser.ID,
			req.Content,
			req.Privacy,
		)
		if err != nil {
			return err
		}

		operationError = "could not set post visibility"
		for _, userID := range selectedUserIDs {
			if err := addPostVisibility(tx, postID, userID); err != nil {
				return err
			}
		}

		operationError = "could not save post"
		return nil
	}); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, operationError)
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, models.PostResponse{
		ID:        postID,
		AuthorID:  currentUser.ID,
		Content:   req.Content,
		Privacy:   req.Privacy,
		CreatedAt: createdAt,
	})
}

func (h *Handler) Post(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetPost(w, r)
	case http.MethodDelete:
		h.DeletePost(w, r)
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	deleted, err := deactivatePost(h.DB, r.PathValue("post_id"), currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not delete post")
		return
	}
	if !deleted {
		helpers.WriteError(w, http.StatusNotFound, "post not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetFeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit, err := helpers.ParsePageLimit(r.URL.Query().Get("limit"), 10)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "limit must be an integer between 1 and 50")
		return
	}

	cursor := strings.TrimSpace(r.URL.Query().Get("cursor"))
	cursorCreatedAt := ""
	if cursor != "" {
		cursorPost, found, err := GetPostForViewer(h.DB, cursor, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "could not read feed cursor")
			return
		}
		if !found {
			helpers.WriteError(w, http.StatusBadRequest, "invalid cursor")
			return
		}
		cursorCreatedAt = cursorPost.CreatedAt
	}

	rows, err := getFeedPosts(h.DB, currentUser.ID, cursor, cursorCreatedAt, limit+1)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not fetch feed")
		return
	}
	defer rows.Close()

	posts := make([]models.PostResponse, 0, limit)
	hasMore := false

	for rows.Next() {
		if len(posts) == limit {
			hasMore = true
			break
		}

		var post models.PostResponse

		if err := rows.Scan(
			&post.ID,
			&post.AuthorID,
			&post.AuthorNickname,
			&post.AuthorFirstName,
			&post.AuthorLastName,
			&post.AuthorAvatarPath,
			&post.Content,
			&post.Privacy,
			&post.AuthorPrivacy,
			&post.CreatedAt,
			&post.LikeCount,
			&post.DislikeCount,
			&post.CommentCount,
			&post.ViewerReaction,
		); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "could not read feed post")
			return
		}

		posts = append(posts, post)
	}

	if err := rows.Err(); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not read feed")
		return
	}

	if err := AttachPostMedia(h.DB, posts); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not read post media")
		return
	}
	for i := range posts {
		posts[i].AuthorAvatarPath = helpers.PublicMediaPath(posts[i].AuthorAvatarPath)
	}

	nextCursor := ""
	if hasMore {
		nextCursor = posts[len(posts)-1].ID
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]any{
		"posts":       posts,
		"next_cursor": nextCursor,
	})
}

func (h *Handler) GetPost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	postID := r.PathValue("post_id")
	post, found, err := GetPostForViewer(h.DB, postID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not fetch post")
		return
	}
	if !found {
		helpers.WriteError(w, http.StatusNotFound, "post not found")
		return
	}

	post.Media, err = getPostMedia(h.DB, post.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not read post media")
		return
	}
	post.AuthorAvatarPath = helpers.PublicMediaPath(post.AuthorAvatarPath)

	helpers.WriteJSON(w, http.StatusOK, map[string]any{"post": post})
}
