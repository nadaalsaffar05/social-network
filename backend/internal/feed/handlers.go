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

	postID := uuid.New().String()

	if err := createPost(
		h.DB,
		postID,
		currentUser.ID,
		req.Content,
		req.Privacy,
	); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not create post")
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, models.PostResponse{
		ID:       postID,
		AuthorID: currentUser.ID,
		Content:  req.Content,
		Privacy:  req.Privacy,
	})
}

func isValidPrivacy(
	privacy enums.PostPrivacy,
) bool {
	switch privacy {
	case enums.PostPrivacyPublic,
		enums.PostPrivacyFollowers,
		enums.PostPrivacySelected:
		return true
	default:
		return false
	}
}
