package models

import "social-network/internal/enums"

type CreatePostRequest struct {
	Content         string            `json:"content"`
	Privacy         enums.PostPrivacy `json:"privacy"`
	SelectedUserIDs []string          `json:"selected_user_ids,omitempty"`
}

type PostResponse struct {
	ID               string            `json:"id"`
	AuthorID         string            `json:"author_id"`
	AuthorNickname   string            `json:"author_nickname,omitempty"`
	AuthorFirstName  string            `json:"author_first_name,omitempty"`
	AuthorLastName   string            `json:"author_last_name,omitempty"`
	AuthorAvatarPath *string           `json:"author_avatar_path,omitempty"`
	Content          string            `json:"content"`
	Privacy          enums.PostPrivacy `json:"privacy"`
	CreatedAt        string            `json:"created_at"`
	Media            []string          `json:"media,omitempty"`
	LikeCount        int               `json:"like_count"`
	DislikeCount     int               `json:"dislike_count"`
	ViewerReaction   *string           `json:"viewer_reaction,omitempty"`
}
