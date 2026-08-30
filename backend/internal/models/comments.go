package models

type CreateCommentRequest struct {
	Content         string  `json:"content"`
	ParentCommentID *string `json:"parent_comment_id,omitempty"`
}

type CommentResponse struct {
	ID               string   `json:"id"`
	PostID           string   `json:"post_id"`
	AuthorID         string   `json:"author_id"`
	AuthorNickname   string   `json:"author_nickname,omitempty"`
	AuthorFirstName  string   `json:"author_first_name,omitempty"`
	AuthorLastName   string   `json:"author_last_name,omitempty"`
	AuthorAvatarPath *string  `json:"author_avatar_path,omitempty"`
	ParentCommentID  *string  `json:"parent_comment_id,omitempty"`
	Content          string   `json:"content"`
	CreatedAt        string   `json:"created_at"`
	Media            []string `json:"media,omitempty"`
	LikeCount        int      `json:"like_count"`
	DislikeCount     int      `json:"dislike_count"`
	ViewerReaction   *string  `json:"viewer_reaction,omitempty"`
}
