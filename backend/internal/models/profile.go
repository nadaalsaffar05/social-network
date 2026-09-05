package models

import "social-network/internal/enums"

type UserPost struct {
	ID             string            `json:"id"`
	AuthorID       string            `json:"author_id"`
	Content        string            `json:"content"`
	Privacy        enums.PostPrivacy `json:"privacy"`
	CreatedAt      string            `json:"created_at"`
	UpdatedAt      string            `json:"updated_at"`
	Media          []string          `json:"media,omitempty"`
	LikeCount      int               `json:"like_count"`
	DislikeCount   int               `json:"dislike_count"`
	CommentCount   int               `json:"comment_count"`
	ViewerReaction *string           `json:"viewer_reaction,omitempty"`
}

type ProfileResponse struct {
	ID             string               `json:"id"`
	Email          string               `json:"email"`
	FirstName      string               `json:"first_name"`
	LastName       string               `json:"last_name"`
	DateOfBirth    string               `json:"date_of_birth"`
	Nickname       *string              `json:"nickname,omitempty"`
	AboutMe        *string              `json:"about_me,omitempty"`
	Privacy        enums.ProfilePrivacy `json:"privacy"`
	AvatarPath     *string              `json:"avatar_path,omitempty"`
	FollowersCount int                  `json:"followers_count"`
	FollowingCount int                  `json:"following_count"`
	PostsCount     int                  `json:"posts_count"`
	Posts          []UserPost           `json:"posts"`
}

type FollowUserItem struct {
	ID         string               `json:"id"`
	Email      string               `json:"email"`
	FirstName  string               `json:"first_name"`
	LastName   string               `json:"last_name"`
	Nickname   *string              `json:"nickname,omitempty"`
	AvatarPath *string              `json:"avatar_path,omitempty"`
	Privacy    enums.ProfilePrivacy `json:"privacy"`
}

type FollowRequestItem struct {
	ID         string               `json:"id"`
	SenderID   string               `json:"sender_id"`
	Email      string               `json:"email"`
	FirstName  string               `json:"first_name"`
	LastName   string               `json:"last_name"`
	Nickname   *string              `json:"nickname,omitempty"`
	AvatarPath *string              `json:"avatar_path,omitempty"`
	Privacy    enums.ProfilePrivacy `json:"privacy"`
	CreatedAt  string               `json:"created_at"`
}

type PublicProfileResponse struct {
	ID             string               `json:"id"`
	FirstName      string               `json:"first_name"`
	LastName       string               `json:"last_name"`
	Nickname       *string              `json:"nickname,omitempty"`
	AboutMe        *string              `json:"about_me,omitempty"`
	Privacy        enums.ProfilePrivacy `json:"privacy"`
	AvatarPath     *string              `json:"avatar_path,omitempty"`
	FollowersCount int                  `json:"followers_count"`
	FollowingCount int                  `json:"following_count"`
}

type UpdateProfileRequest struct {
	FirstName   string               `json:"first_name"`
	LastName    string               `json:"last_name"`
	Nickname    *string              `json:"nickname"`
	AboutMe     *string              `json:"about_me"`
	DateOfBirth string               `json:"date_of_birth"`
	Privacy     enums.ProfilePrivacy `json:"privacy"`
}

