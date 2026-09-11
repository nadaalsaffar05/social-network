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
	GroupResponse
	IsMember          bool `json:"is_member"`
	HasPendingRequest bool `json:"has_pending_request"`
	HasPendingInvite  bool `json:"has_pending_invite"`
}

// can add avatar maybe
type GroupMemberResponse struct {
	UserID    string                `json:"user_id"`
	FirstName string                `json:"first_name"`
	LastName  string                `json:"last_name"`
	Nickname  *string               `json:"nickname,omitempty"`
	Role      enums.GroupMemberRole `json:"role"`
	JoinedAt  string                `json:"joined_at"`
}

type GroupJoinRequestResponse struct {
	RequestID string                       `json:"request_id"`
	GroupID   string                       `json:"group_id"`
	UserID    string                       `json:"user_id"`
	FirstName string                       `json:"first_name"`
	LastName  string                       `json:"last_name"`
	Nickname  *string                      `json:"nickname,omitempty"`
	Status    enums.GroupJoinRequestStatus `json:"status"`
	CreatedAt string                       `json:"created_at"`
}

type GroupInvitationResponse struct {
	InviteID             string                      `json:"invite_id"`
	GroupID              string                      `json:"group_id"`
	InviterID            string                      `json:"inviter_id"`
	InviterFirstName     string                      `json:"inviter_first_name"`
	InviterLastName      string                      `json:"inviter_last_name"`
	InviterNickname      *string                     `json:"inviter_nickname,omitempty"`
	InvitedUserID        string                      `json:"invited_user_id"`
	InvitedUserFirstName string                      `json:"invited_user_first_name"`
	InvitedUserLastName  string                      `json:"invited_user_last_name"`
	InvitedUserNickname  *string                     `json:"invited_user_nickname,omitempty"`
	Status               enums.GroupInvitationStatus `json:"status"`
	CreatedAt            string                      `json:"created_at"`
}

type UserGroupInvitationResponse struct {
	InviteID         string                      `json:"invite_id"`
	GroupID          string                      `json:"group_id"`
	GroupTitle       string                      `json:"group_title"`
	InviterID        string                      `json:"inviter_id"`
	InviterFirstName string                      `json:"inviter_first_name"`
	InviterLastName  string                      `json:"inviter_last_name"`
	InviterNickname  *string                     `json:"inviter_nickname,omitempty"`
	Status           enums.GroupInvitationStatus `json:"status"`
	CreatedAt        string                      `json:"created_at"`
}

type GroupEventResponse struct {
	ID               string               `json:"id"`
	GroupID          string               `json:"group_id"`
	CreatorID        string               `json:"creator_id"`
	CreatorFirstName string               `json:"creator_first_name"`
	CreatorLastName  string               `json:"creator_last_name"`
	CreatorNickname  *string              `json:"creator_nickname,omitempty"`
	Title            string               `json:"title"`
	Description      string               `json:"description"`
	StartsAt         string               `json:"starts_at"`
	CreatedAt        string               `json:"created_at"`
	MyResponse       *enums.EventResponse `json:"my_response,omitempty"`
}
