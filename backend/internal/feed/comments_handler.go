package feed

import (
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/google/uuid"
)

func (h *Handler) Comments(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.GetComments(w, r)
	case http.MethodPost:
		h.CreateComment(w, r)
	default:
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *Handler) Comment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	deleted, err := deactivateComment(h.DB, r.PathValue("comment_id"), r.PathValue("post_id"), currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not delete comment")
		return
	}
	if !deleted {
		helpers.WriteError(w, http.StatusNotFound, "comment not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	postID := r.PathValue("post_id")
	if postID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "post_id is required")
		return
	}

	// Check whether the user can view the post.
	canView, err := canViewPost(h.DB, postID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not check post")
		return
	}

	if !canView {
		helpers.WriteError(w, http.StatusNotFound, "post not found")
		return
	}

	var req models.CreateCommentRequest

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Content = strings.TrimSpace(req.Content)

	if req.Content == "" {
		helpers.WriteError(w, http.StatusBadRequest, "content is required")
		return
	}

	if len([]rune(req.Content)) > 5000 {
		helpers.WriteError(w, http.StatusBadRequest, "content must be at most 5000 characters")
		return
	}

	// If this is a reply, make sure the parent comment belongs to this post.
	if req.ParentCommentID != nil {
		parentCommentID := strings.TrimSpace(*req.ParentCommentID)

		if parentCommentID == "" {
			helpers.WriteError(w, http.StatusBadRequest, "parent_comment_id cannot be empty")
			return
		}

		_, parentExists, err := getActiveCommentAuthor(h.DB, parentCommentID, postID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "could not check parent comment")
			return
		}

		if !parentExists {
			helpers.WriteError(w, http.StatusBadRequest, "parent comment not found")
			return
		}

		req.ParentCommentID = &parentCommentID
	}

	commentID := uuid.New().String()

	var createdAt string

	err = h.DB.QueryRow(`
		INSERT INTO comments (
			id,
			post_id,
			author_id,
			parent_comment_id,
			content
		)
		VALUES (?, ?, ?, ?, ?)
		RETURNING created_at
	`,
		commentID,
		postID,
		currentUser.ID,
		req.ParentCommentID,
		req.Content,
	).Scan(&createdAt)

	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not create comment")
		return
	}

	helpers.WriteJSON(w, http.StatusCreated, models.CommentResponse{
		ID:              commentID,
		PostID:          postID,
		AuthorID:        currentUser.ID,
		ParentCommentID: req.ParentCommentID,
		Content:         req.Content,
		CreatedAt:       createdAt,
	})
}

func (h *Handler) GetComments(w http.ResponseWriter, r *http.Request) {
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
	if postID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "post_id is required")
		return
	}

	canView, err := canViewPost(h.DB, postID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not check post")
		return
	}

	if !canView {
		helpers.WriteError(w, http.StatusNotFound, "post not found")
		return
	}

	rows, err := getComments(h.DB, postID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not fetch comments")
		return
	}
	defer rows.Close()

	comments := make([]models.CommentResponse, 0)

	for rows.Next() {
		var comment models.CommentResponse

		if err := rows.Scan(
			&comment.ID,
			&comment.PostID,
			&comment.AuthorID,
			&comment.AuthorNickname,
			&comment.AuthorFirstName,
			&comment.AuthorLastName,
			&comment.AuthorAvatarPath,
			&comment.ParentCommentID,
			&comment.Content,
			&comment.CreatedAt,
			&comment.LikeCount,
			&comment.DislikeCount,
			&comment.ViewerReaction,
		); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "could not read comments")
			return
		}

		comments = append(comments, comment)
	}

	if err := rows.Err(); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not read comments")
		return
	}

	commentIDs := make([]string, len(comments))
	for i, comment := range comments {
		commentIDs[i] = comment.ID
	}
	mediaByComment, err := getCommentMediaForComments(h.DB, commentIDs)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not read comment media")
		return
	}
	for i := range comments {
		comments[i].Media = mediaByComment[comments[i].ID]
		comments[i].AuthorAvatarPath = helpers.PublicMediaPath(comments[i].AuthorAvatarPath)
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]any{
		"comments": comments,
	})
}
