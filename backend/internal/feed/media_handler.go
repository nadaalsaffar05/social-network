package feed

import (
	"database/sql"
	"errors"
	"net/http"

	"social-network/internal/auth"
	"social-network/internal/helpers"
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
	upload, ok := parseMediaUpload(w, r, "uploads/posts")
	if !ok {
		return
	}

	keepFile := false
	defer func() {
		if !keepFile {
			upload.removeFile()
		}
	}()

	operationError := "could not start transaction"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		operationError = "could not record post media"
		if err := addPostMedia(tx, postID, upload.ID, currentUser.ID, upload.FileName, upload.RelativePath, upload.MIMEType, upload.FileSize, upload.Position); err != nil {
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
		"media_id":  upload.ID,
		"file_path": helpers.PublicMediaURL(upload.RelativePath),
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

	upload, ok := parseMediaUpload(w, r, "uploads/comments")
	if !ok {
		return
	}

	keepFile := false
	defer func() {
		if !keepFile {
			upload.removeFile()
		}
	}()

	operationError := "could not start transaction"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		operationError = "could not record comment media"
		if err := addCommentMedia(
			tx,
			commentID,
			upload.ID,
			currentUser.ID,
			upload.FileName,
			upload.RelativePath,
			upload.MIMEType,
			upload.FileSize,
			upload.Position,
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
		"media_id":  upload.ID,
		"file_path": helpers.PublicMediaURL(upload.RelativePath),
	})
}
