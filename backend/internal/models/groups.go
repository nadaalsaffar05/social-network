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
	IsMember          bool    `json:"is_member"`
	CreatorFirstName  string  `json:"creator_first_name"`
	CreatorLastName   string  `json:"creator_last_name"`
	CreatorNickname   *string `json:"creator_nickname,omitempty"`
	MemberCount       int     `json:"member_count"`
	JoinedAt          *string `json:"joined_at,omitempty"`
	HasPendingRequest bool    `json:"has_pending_request"`
	HasPendingInvite  bool    `json:"has_pending_invite"`
}

type GroupsPageResponse struct {
	Groups     []GroupDetailsResponse `json:"groups"`
	NextCursor string                 `json:"next_cursor,omitempty"`
}

type GroupMemberResponse struct {
	UserID     string                `json:"user_id"`
	FirstName  string                `json:"first_name"`
	LastName   string                `json:"last_name"`
	Nickname   *string               `json:"nickname,omitempty"`
	AvatarPath *string               `json:"avatar_path,omitempty"`
	Role       enums.GroupMemberRole `json:"role"`
	JoinedAt   string                `json:"joined_at"`
}

type GroupMembersPageResponse struct {
	Members    []GroupMemberResponse `json:"members"`
	NextCursor string                `json:"next_cursor,omitempty"`
}

type GroupJoinRequestResponse struct {
	RequestID  string                       `json:"request_id"`
	GroupID    string                       `json:"group_id"`
	UserID     string                       `json:"user_id"`
	FirstName  string                       `json:"first_name"`
	LastName   string                       `json:"last_name"`
	Nickname   *string                      `json:"nickname,omitempty"`
	AvatarPath *string                      `json:"avatar_path,omitempty"`
	Status     enums.GroupJoinRequestStatus `json:"status"`
	CreatedAt  string                       `json:"created_at"`
}

type GroupJoinRequestsPageResponse struct {
	Requests   []GroupJoinRequestResponse `json:"requests"`
	NextCursor string                     `json:"next_cursor,omitempty"`
	Total      int                        `json:"total"`
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
	ID                string               `json:"id"`
	GroupID           string               `json:"group_id"`
	CreatorID         string               `json:"creator_id"`
	CreatorFirstName  string               `json:"creator_first_name"`
	CreatorLastName   string               `json:"creator_last_name"`
	CreatorNickname   *string              `json:"creator_nickname,omitempty"`
	CreatorAvatarPath *string              `json:"creator_avatar_path,omitempty"`
	Title             string               `json:"title"`
	Description       string               `json:"description"`
	StartsAt          string               `json:"starts_at"`
	CreatedAt         string               `json:"created_at"`
	MyResponse        *enums.EventResponse `json:"my_response,omitempty"`
}

type GroupEventsPageResponse struct {
	Events     []GroupEventResponse `json:"events"`
	NextCursor string               `json:"next_cursor,omitempty"`
}

type GroupMessage struct {
	PublicID        string                 `json:"public_id"`
	GroupID         string                 `json:"group_id"`
	SenderID        string                 `json:"sender_id"`
	SenderFirstName string                 `json:"sender_first_name"`
	SenderLastName  string                 `json:"sender_last_name"`
	SenderNickname  *string                `json:"sender_nickname,omitempty"`
	Content         string                 `json:"content"`
	CreatedAt       string                 `json:"created_at"`
	IsActive        bool                   `json:"is_active"`
	ReadCount       int                    `json:"read_count"`
	ReadBy          []ChatUser             `json:"read_by"`
	Reactions       []MessageReaction      `json:"reactions"`
	ReactionSummary []GroupMessageReaction `json:"reaction_summary"`
}

type GroupMessagesResponse struct {
	Messages   []GroupMessage `json:"messages"`
	NextCursor string         `json:"next_cursor,omitempty"`
}

type GroupMessageReaction struct {
	Emoji          string   `json:"emoji"`
	Count          int      `json:"count"`
	ViewerReacted  bool     `json:"viewer_reacted"`
	ReactedUserIDs []string `json:"reacted_user_ids,omitempty"`
}

type GroupMessageReactionEvent struct {
	GroupID         string                 `json:"group_id"`
	PublicID        string                 `json:"public_id"`
	Reactions       []MessageReaction      `json:"reactions"`
	ReactionSummary []GroupMessageReaction `json:"reaction_summary"`
}

type GroupMessageReadEvent struct {
	GroupID   string     `json:"group_id"`
	PublicID  string     `json:"public_id"`
	ReadCount int        `json:"read_count"`
	ReadBy    []ChatUser `json:"read_by"`
}

type GroupTypingEvent struct {
	GroupID     string     `json:"group_id"`
	TypingCount int        `json:"typing_count"`
	Typers      []ChatUser `json:"typers"`
}
