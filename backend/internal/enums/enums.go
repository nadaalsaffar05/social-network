// Package enums contains the integer values persisted for fixed domain states.
package enums

type FollowRequestStatus int

const (
	FollowRequestStatusPending  FollowRequestStatus = 1000
	FollowRequestStatusAccepted FollowRequestStatus = 1010
	FollowRequestStatusDeclined FollowRequestStatus = 1020
)

type GroupInvitationStatus int

const (
	GroupInvitationStatusPending   GroupInvitationStatus = 1000
	GroupInvitationStatusAccepted  GroupInvitationStatus = 1010
	GroupInvitationStatusDeclined  GroupInvitationStatus = 1020
	GroupInvitationStatusCancelled GroupInvitationStatus = 1030
)

type GroupJoinRequestStatus int

const (
	GroupJoinRequestStatusPending   GroupJoinRequestStatus = 1000
	GroupJoinRequestStatusAccepted  GroupJoinRequestStatus = 1010
	GroupJoinRequestStatusDeclined  GroupJoinRequestStatus = 1020
	GroupJoinRequestStatusCancelled GroupJoinRequestStatus = 1030
)

type GroupMembershipStatus int

const (
	GroupMembershipStatusActive  GroupMembershipStatus = 1000
	GroupMembershipStatusRemoved GroupMembershipStatus = 1010
)

type ProfilePrivacy int

const (
	ProfilePrivacyPublic  ProfilePrivacy = 1000
	ProfilePrivacyPrivate ProfilePrivacy = 1010
)

type PostPrivacy int

const (
	PostPrivacyPublic    PostPrivacy = 1000
	PostPrivacyFollowers PostPrivacy = 1010
	PostPrivacySelected  PostPrivacy = 1020
	PostPrivacyGroup     PostPrivacy = 1030
)

type EventResponse int

const (
	EventResponseGoing    EventResponse = 1000
	EventResponseNotGoing EventResponse = 1010
)

type NotificationType int

const (
	NotificationTypeFollowRequest    NotificationType = 1000
	NotificationTypeGroupInvitation  NotificationType = 1010
	NotificationTypeGroupJoinRequest NotificationType = 1020
	NotificationTypeEventCreated     NotificationType = 1030
	NotificationTypeFollowAccepted   NotificationType = 1040
	NotificationTypePostReaction     NotificationType = 1050
	NotificationTypeCommentReaction  NotificationType = 1060
	NotificationTypeComment          NotificationType = 1070
	NotificationTypeNewFollower      NotificationType = 1080
	NotificationTypeBirthday         NotificationType = 1090
	NotificationTypeEventReminder    NotificationType = 1100
)

type ProfilePfpType int

const (
	ProfilePfpTypeGeneric ProfilePfpType = 1000
	ProfilePfpTypeCustom  ProfilePfpType = 1010
)

type GroupMemberRole string

const (
	GroupMemberRoleCreator GroupMemberRole = "CREATOR"
	GroupMemberRoleMember  GroupMemberRole = "MEMBER"
)

// PostCommentReactionType is the fixed reaction set for posts and comments.
type PostCommentReactionType string

const (
	PostCommentReactionTypeLike    PostCommentReactionType = "LIKE"
	PostCommentReactionTypeDislike PostCommentReactionType = "DISLIKE"
)

// MessageReactionType is reserved for private and group chat reactions.
type MessageReactionType string

const (
	MessageReactionTypeLike  MessageReactionType = "LIKE"
	MessageReactionTypeLove  MessageReactionType = "LOVE"
	MessageReactionTypeHaha  MessageReactionType = "HAHA"
	MessageReactionTypeWow   MessageReactionType = "WOW"
	MessageReactionTypeSad   MessageReactionType = "SAD"
	MessageReactionTypeAngry MessageReactionType = "ANGRY"
)

type MediaMIMEType string

const (
	MediaMIMETypeJPEG MediaMIMEType = "image/jpeg"
	MediaMIMETypePNG  MediaMIMEType = "image/png"
	MediaMIMETypeGIF  MediaMIMEType = "image/gif"
)
