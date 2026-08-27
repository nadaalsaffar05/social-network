package feed

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"
	"strings"

	"github.com/google/uuid"
)

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

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

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Content = strings.TrimSpace(req.Content)

	if req.Content == "" {
		helpers.WriteError(w, http.StatusBadRequest, "content is required")
		return
	}

	if len([]rune(req.Content)) > 10000 {
		helpers.WriteError(w, http.StatusBadRequest, "content must be at most 10000 characters")
		return
	}

	if !isValidPrivacy(req.Privacy) {
		helpers.WriteError(w, http.StatusBadRequest, "invalid privacy")
		return
	}

	// Selected users are only allowed for Selected privacy.
	if req.Privacy != enums.PostPrivacySelected && len(req.SelectedUserIDs) > 0 {
		helpers.WriteError(w, http.StatusBadRequest, "selected users are only allowed for selected privacy")
		return
	}

	// Remove duplicate or blank user IDs before validating selected privacy.
	selectedUserIDs := helpers.UniqueIDs(req.SelectedUserIDs)

	// Selected privacy requires at least one selected user.
	if req.Privacy == enums.PostPrivacySelected && len(selectedUserIDs) == 0 {
		helpers.WriteError(w, http.StatusBadRequest, "at least one selected user is required")
		return
	}

	// Every selected user must follow the author.
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

	tx, err := h.DB.Begin()
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not start transaction")
		return
	}
	defer tx.Rollback()

	postID := uuid.New().String()

	createdAt, err := createPost(
		tx,
		postID,
		currentUser.ID,
		req.Content,
		req.Privacy,
	)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not create post")
		return
	}

	// Add selected users to post visibility.
	for _, userID := range selectedUserIDs {
		if err := addPostVisibility(tx, postID, userID); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "could not set post visibility")
			return
		}
	}

	if err := tx.Commit(); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not save post")
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

	rows, err := getFeedPosts(h.DB, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not fetch feed")
		return
	}
	defer rows.Close()

	posts := make([]models.PostResponse, 0)

	for rows.Next() {
		var post models.PostResponse

		if err := rows.Scan(
			&post.ID,
			&post.AuthorID,
			&post.Content,
			&post.Privacy,
			&post.CreatedAt,
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

	helpers.WriteJSON(w, http.StatusOK, map[string]any{
		"posts": posts,
	})
}

func isValidPrivacy(privacy enums.PostPrivacy) bool {
	switch privacy {
	case enums.PostPrivacyPublic,
		enums.PostPrivacyFollowers,
		enums.PostPrivacySelected:
		return true
	default:
		return false
	}
}
