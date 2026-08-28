package models

type CreateCommentRequest struct {
	Content         string  `json:"content"`
	ParentCommentID *string `json:"parent_comment_id,omitempty"`
}

type CommentResponse struct {
	ID              string  `json:"id"`
	PostID          string  `json:"post_id"`
	AuthorID        string  `json:"author_id"`
	ParentCommentID *string `json:"parent_comment_id,omitempty"`
	Content         string  `json:"content"`
	CreatedAt       string  `json:"created_at"`
}