package feed

import (
	"database/sql"
	"errors"
	"io"
	"net/http"
	"os"
	"strconv"

	"social-network/internal/auth"
	"social-network/internal/helpers"

	"github.com/google/uuid"
)

func (h *Handler) UploadPostMedia(w http.ResponseWriter, r *http.Request) {
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

	var groupID sql.NullString
	err := h.DB.QueryRow(`
		SELECT group_id
		FROM posts
		WHERE id = ?
		  AND author_id = ?
		  AND is_active = 1
	`, postID, currentUser.ID).Scan(&groupID)
	if errors.Is(err, sql.ErrNoRows) {
		helpers.WriteError(w, http.StatusNotFound, "post not found")
		return
	}
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not check post")
		return
	}

	if groupID.Valid {
		active, err := isActiveGroupMember(h.DB, groupID.String, currentUser.ID)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "could not check group membership")
			return
		}
		if !active {
			helpers.WriteError(w, http.StatusForbidden, "you must be an active group member to upload group post media")
			return
		}
	}
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid or oversized upload")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	mimeType, err := detectMediaMIMEType(file)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "only JPEG, PNG, and GIF are allowed")
		return
	}

	position, err := strconv.Atoi(r.FormValue("position"))
	if err != nil || position < 0 {
		helpers.WriteError(w, http.StatusBadRequest, "position must be a non-negative integer")
		return
	}

	mediaID := uuid.New().String()
	uploadDir := "uploads/posts"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not create upload directory")
		return
	}

	relativePath := uploadDir + "/" + mediaID + mediaExtension(mimeType)
	destination, err := os.Create(relativePath)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not save media")
		return
	}

	fileSize, copyErr := io.Copy(destination, file)
	closeErr := destination.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(relativePath)
		helpers.WriteError(w, http.StatusInternalServerError, "could not write media")
		return
	}
	if fileSize == 0 {
		_ = os.Remove(relativePath)
		helpers.WriteError(w, http.StatusBadRequest, "file cannot be empty")
		return
	}

	keepFile := false
	defer func() {
		if !keepFile {
			_ = os.Remove(relativePath)
		}
	}()

	operationError := "could not start transaction"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		operationError = "could not record post media"
		if err := addPostMedia(tx, postID, mediaID, currentUser.ID, header.Filename, relativePath, mimeType, fileSize, position); err != nil {
			return err
		}

		operationError = "could not save post media"
		return nil
	}); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, operationError)
		return
	}

	keepFile = true
	helpers.WriteJSON(w, http.StatusCreated, map[string]string{
		"media_id":  mediaID,
		"file_path": "/" + relativePath,
	})
}

func (h *Handler) UploadCommentMedia(w http.ResponseWriter, r *http.Request) {
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
	commentID := r.PathValue("comment_id")

	if postID == "" || commentID == "" {
		helpers.WriteError(w, http.StatusBadRequest, "post_id and comment_id are required")
		return
	}

	// Make sure the comment belongs to this post and the current user
	// is allowed to view the post.
	canView, err := canViewPost(h.DB, postID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not check post")
		return
	}

	if !canView {
		helpers.WriteError(w, http.StatusNotFound, "post not found")
		return
	}

	commentAuthorID, commentExists, err := getActiveCommentAuthor(h.DB, commentID, postID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not check comment")
		return
	}
	if !commentExists {
		helpers.WriteError(w, http.StatusNotFound, "comment not found")
		return
	}

	if commentAuthorID != currentUser.ID {
		helpers.WriteError(w, http.StatusForbidden, "you cannot add media to this comment")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid or oversized upload")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	mimeType, err := detectMediaMIMEType(file)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "only JPEG, PNG, and GIF are allowed")
		return
	}

	position, err := strconv.Atoi(r.FormValue("position"))
	if err != nil || position < 0 {
		helpers.WriteError(w, http.StatusBadRequest, "position must be a non-negative integer")
		return
	}

	mediaID := uuid.New().String()

	uploadDir := "uploads/comments"

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not create upload directory")
		return
	}

	relativePath := uploadDir + "/" + mediaID + mediaExtension(mimeType)

	destination, err := os.Create(relativePath)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not save media")
		return
	}

	fileSize, copyErr := io.Copy(destination, file)
	closeErr := destination.Close()

	if copyErr != nil || closeErr != nil {
		_ = os.Remove(relativePath)
		helpers.WriteError(w, http.StatusInternalServerError, "could not write media")
		return
	}

	if fileSize == 0 {
		_ = os.Remove(relativePath)
		helpers.WriteError(w, http.StatusBadRequest, "file cannot be empty")
		return
	}

	keepFile := false
	defer func() {
		if !keepFile {
			_ = os.Remove(relativePath)
		}
	}()

	operationError := "could not start transaction"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		operationError = "could not record comment media"
		if err := addCommentMedia(
			tx,
			commentID,
			mediaID,
			currentUser.ID,
			header.Filename,
			relativePath,
			mimeType,
			fileSize,
			position,
		); err != nil {
			return err
		}

		operationError = "could not save comment media"
		return nil
	}); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, operationError)
		return
	}

	keepFile = true

	helpers.WriteJSON(w, http.StatusCreated, map[string]string{
		"media_id":  mediaID,
		"file_path": "/" + relativePath,
	})
}
