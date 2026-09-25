package models

import "social-network/internal/enums"

// NotificationResponse is the in-app notification shape returned to its recipient.
type NotificationResponse struct {
	ID                 string                 `json:"id"`
	Type               enums.NotificationType `json:"type"`
	IsRead             bool                   `json:"is_read"`
	CreatedAt          string                 `json:"created_at"`
	Actor              *ChatUser              `json:"actor,omitempty"`
	FollowRequestID    *string                `json:"follow_request_id,omitempty"`
	GroupInvitationID  *string                `json:"group_invitation_id,omitempty"`
	GroupJoinRequestID *string                `json:"group_join_request_id,omitempty"`
	GroupEventID       *string                `json:"group_event_id,omitempty"`
	PostID             *string                `json:"post_id,omitempty"`
	CommentID          *string                `json:"comment_id,omitempty"`
	GroupID            *string                `json:"group_id,omitempty"`
	GroupTitle         *string                `json:"group_title,omitempty"`
	Actionable         bool                   `json:"actionable"`
	ActionStatus       *int                   `json:"action_status,omitempty"`
}

type NotificationsResponse struct {
	Notifications []NotificationResponse `json:"notifications"`
	UnreadCount   int                    `json:"unread_count"`
}
