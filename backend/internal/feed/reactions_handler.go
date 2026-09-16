package feed

import (
	"database/sql"
	"errors"
	"net/http"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

func (h *Handler) TogglePostReaction(w http.ResponseWriter, r *http.Request) {
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

	canView, err := canViewPost(h.DB, postID, currentUser.ID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not check post")
		return
	}

	if !canView {
		helpers.WriteError(w, http.StatusNotFound, "post not found")
		return
	}

	var req models.ToggleReactionRequest

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	normalizedReactionType, err := NormalizePostCommentReaction(req.ReactionType)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	action := "added"
	var reactionType *string
	var likeCount, dislikeCount int
	operationError := "could not start transaction"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		var existingReaction string

		operationError = "could not check reaction"
		err := tx.QueryRow(`
			SELECT reaction_type
			FROM post_reactions
			WHERE post_id = ? AND user_id = ?
		`, postID, currentUser.ID).Scan(&existingReaction)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}

		if err == nil {
			if existingReaction == normalizedReactionType {
				operationError = "could not remove reaction"
				if _, err := tx.Exec(`
					DELETE FROM post_reactions
					WHERE post_id = ? AND user_id = ?
				`, postID, currentUser.ID); err != nil {
					return err
				}
				action = "removed"
			} else {
				operationError = "could not change reaction"
				if _, err := tx.Exec(`
					UPDATE post_reactions
					SET reaction_type = ?
					WHERE post_id = ? AND user_id = ?
				`, normalizedReactionType, postID, currentUser.ID); err != nil {
					return err
				}
				reactionType = &normalizedReactionType
			}
		} else {
			operationError = "could not add reaction"
			if _, err := tx.Exec(`
				INSERT INTO post_reactions (
					post_id,
					user_id,
					reaction_type
				)
				VALUES (?, ?, ?)
			`, postID, currentUser.ID, normalizedReactionType); err != nil {
				return err
			}
			reactionType = &normalizedReactionType
		}

		operationError = "could not get reaction counts"
		likeCount, dislikeCount, err = getPostReactionCounts(tx, postID)
		if err != nil {
			return err
		}

		operationError = "could not save reaction"
		return nil
	}); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, operationError)
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]any{
		"action":        action,
		"reaction_type": reactionType,
		"counts": map[string]int{
			"LIKE":    likeCount,
			"DISLIKE": dislikeCount,
		},
	})
}

func (h *Handler) ToggleCommentReaction(w http.ResponseWriter, r *http.Request) {
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

	_, exists, err := getActiveCommentAuthor(h.DB, commentID, postID)
	if err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, "could not check comment")
		return
	}

	if !exists {
		helpers.WriteError(w, http.StatusNotFound, "comment not found")
		return
	}

	var req models.ToggleReactionRequest

	if err := helpers.ParseJSON(r.Body, &req); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	normalizedReactionType, err := NormalizePostCommentReaction(req.ReactionType)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	action := "added"
	var reactionType *string
	var likeCount, dislikeCount int
	operationError := "could not start transaction"
	if err := helpers.WithTx(h.DB, func(tx *sql.Tx) error {
		var existingReaction string

		operationError = "could not check reaction"
		err := tx.QueryRow(`
			SELECT reaction_type
			FROM comment_reactions
			WHERE comment_id = ? AND user_id = ?
		`, commentID, currentUser.ID).Scan(&existingReaction)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}

		if err == nil {
			if existingReaction == normalizedReactionType {
				operationError = "could not remove reaction"
				if _, err := tx.Exec(`
					DELETE FROM comment_reactions
					WHERE comment_id = ? AND user_id = ?
				`, commentID, currentUser.ID); err != nil {
					return err
				}
				action = "removed"
			} else {
				operationError = "could not change reaction"
				if _, err := tx.Exec(`
					UPDATE comment_reactions
					SET reaction_type = ?
					WHERE comment_id = ? AND user_id = ?
				`, normalizedReactionType, commentID, currentUser.ID); err != nil {
					return err
				}
				reactionType = &normalizedReactionType
			}
		} else {
			operationError = "could not add reaction"
			if _, err := tx.Exec(`
				INSERT INTO comment_reactions (
					comment_id,
					user_id,
					reaction_type
				)
				VALUES (?, ?, ?)
			`, commentID, currentUser.ID, normalizedReactionType); err != nil {
				return err
			}
			reactionType = &normalizedReactionType
		}

		operationError = "could not get reaction counts"
		likeCount, dislikeCount, err = getCommentReactionCounts(tx, commentID)
		if err != nil {
			return err
		}

		operationError = "could not save reaction"
		return nil
	}); err != nil {
		helpers.WriteError(w, http.StatusInternalServerError, operationError)
		return
	}

	helpers.WriteJSON(w, http.StatusOK, map[string]any{
		"action":        action,
		"reaction_type": reactionType,
		"counts": map[string]int{
			"LIKE":    likeCount,
			"DISLIKE": dislikeCount,
		},
	})
}
