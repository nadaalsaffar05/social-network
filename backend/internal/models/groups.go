package models

import "social-network/internal/enums"

type CreateGroupRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type GroupResponse struct {
	ID          string `json:"id"`
	CreatorID   string `json:"creator_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	CreatedAt   string `json:"created_at"`
}

type GroupDetailsResponse struct {
	ID                string `json:"id"`
	CreatorID         string `json:"creator_id"`
	Title             string `json:"title"`
	Description       string `json:"description"`
	CreatedAt         string `json:"created_at"`
	IsMember          bool   `json:"is_member"`
	HasPendingRequest bool   `json:"has_pending_request"`
}

// can add avatar maybe
type GroupMemberResponse struct {
	UserID    string  `json:"user_id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Nickname  *string `json:"nickname,omitempty"`
	Role      int     `json:"role"`
	JoinedAt  string  `json:"joined_at"`
}

type GroupJoinRequest struct {
	ID        string                       `json:"id"`
	GroupID   string                       `json:"group_id"`
	UserID    string                       `json:"user_id"`
	Status    enums.GroupJoinRequestStatus `json:"status"`
	CreatedAt string                       `json:"created_at"`
}
