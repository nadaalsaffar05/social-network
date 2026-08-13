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
	GroupInvitationStatusPending  GroupInvitationStatus = 1000
	GroupInvitationStatusAccepted GroupInvitationStatus = 1010
	GroupInvitationStatusDeclined GroupInvitationStatus = 1020
)

type GroupJoinRequestStatus int

const (
	GroupJoinRequestStatusPending  GroupJoinRequestStatus = 1000
	GroupJoinRequestStatusAccepted GroupJoinRequestStatus = 1010
	GroupJoinRequestStatusDeclined GroupJoinRequestStatus = 1020
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
)
