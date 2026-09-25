package models

import "social-network/internal/enums"

type SearchUserResult struct {
	ID          string               `json:"id"`
	Email       string               `json:"email"`
	FirstName   string               `json:"first_name"`
	LastName    string               `json:"last_name"`
	Nickname    *string              `json:"nickname,omitempty"`
	AvatarPath  *string              `json:"avatar_path,omitempty"`
	Privacy     enums.ProfilePrivacy `json:"privacy"`
	IsFollowing bool                 `json:"is_following"`
	IsRequested bool                 `json:"is_requested"`
	IsSelf      bool                 `json:"is_self"`
}

type SearchGroupResult struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	MemberCount int    `json:"member_count"`
	IsMember    bool   `json:"is_member"`
	IsPending   bool   `json:"is_pending"`
	CreatedAt   string `json:"created_at"`
}

type SearchPostResult struct {
	ID               string               `json:"id"`
	AuthorID         string               `json:"author_id"`
	AuthorFirstName  string               `json:"author_first_name"`
	AuthorLastName   string               `json:"author_last_name"`
	AuthorNickname   *string              `json:"author_nickname,omitempty"`
	AuthorAvatarPath *string              `json:"author_avatar_path,omitempty"`
	AuthorPrivacy    enums.ProfilePrivacy `json:"author_privacy"`
	GroupID          *string              `json:"group_id,omitempty"`
	GroupTitle       *string              `json:"group_title,omitempty"`
	Content          string               `json:"content"`
	Privacy          enums.PostPrivacy    `json:"privacy"`
	CreatedAt        string               `json:"created_at"`
	LikeCount        int                  `json:"like_count"`
	CommentCount     int                  `json:"comment_count"`
}

type GlobalSearchResponse struct {
	Query  string              `json:"query"`
	Users  []SearchUserResult  `json:"users"`
	Groups []SearchGroupResult `json:"groups"`
	Posts  []SearchPostResult  `json:"posts"`
}
