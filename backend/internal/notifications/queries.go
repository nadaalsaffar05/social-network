package notifications

import (
	"database/sql"

	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/google/uuid"
)

type Execer interface {
	Exec(query string, args ...any) (sql.Result, error)
}

type CreateInput struct {
	RecipientID        string
	ActorID            string
	Type               enums.NotificationType
	FollowRequestID    *string
	GroupInvitationID  *string
	GroupJoinRequestID *string
	GroupEventID       *string
}

func Create(execer Execer, input CreateInput) error {
	return create(execer, input, "INSERT")
}

// CreateIgnoringDuplicate creates a notification when its database uniqueness
// constraint permits it. It is used by scheduled notifications that may be
// checked more than once.
func CreateIgnoringDuplicate(execer Execer, input CreateInput) error {
	return create(execer, input, "INSERT OR IGNORE")
}

func create(execer Execer, input CreateInput, statement string) error {
	_, err := execer.Exec(`
		`+statement+` INTO notifications (
			id,
			recipient_id,
			actor_id,
			type,
			follow_request_id,
			group_invitation_id,
			group_join_request_id,
			group_event_id
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		uuid.NewString(),
		input.RecipientID,
		input.ActorID,
		input.Type,
		input.FollowRequestID,
		input.GroupInvitationID,
		input.GroupJoinRequestID,
		input.GroupEventID,
	)
	return err
}

func list(db *sql.DB, recipientID string) ([]models.NotificationResponse, int, error) {
	rows, err := db.Query(`
		SELECT
			n.id,
			n.type,
			n.is_read,
			n.created_at,
			actor.id,
			actor.first_name,
			actor.last_name,
			actor_profile.nickname,
			actor_media.file_path,
			n.follow_request_id,
			n.group_invitation_id,
			n.group_join_request_id,
			n.group_event_id,
			COALESCE(invitation.group_id, join_request.group_id, event.group_id),
			group_record.title,
			CASE
				WHEN n.type = ? AND follow_request.status = ? THEN 1
				WHEN n.type = ? AND invitation.status = ? THEN 1
				WHEN n.type = ? AND join_request.status = ? THEN 1
				ELSE 0
			END
		FROM notifications n
		LEFT JOIN users actor ON actor.id = n.actor_id
		LEFT JOIN profiles actor_profile ON actor_profile.user_id = actor.id
		LEFT JOIN profile_avatars actor_avatar ON actor_avatar.user_id = actor.id
		LEFT JOIN media actor_media ON actor_media.id = actor_avatar.media_id
		LEFT JOIN follow_requests follow_request ON follow_request.id = n.follow_request_id
		LEFT JOIN group_invitations invitation ON invitation.id = n.group_invitation_id
		LEFT JOIN group_join_requests join_request ON join_request.id = n.group_join_request_id
		LEFT JOIN group_events event ON event.id = n.group_event_id
		LEFT JOIN groups group_record ON group_record.id = COALESCE(invitation.group_id, join_request.group_id, event.group_id)
		WHERE n.recipient_id = ?
		ORDER BY n.created_at DESC, n.id DESC
		LIMIT 100
	`,
		enums.NotificationTypeFollowRequest,
		enums.FollowRequestStatusPending,
		enums.NotificationTypeGroupInvitation,
		enums.GroupInvitationStatusPending,
		enums.NotificationTypeGroupJoinRequest,
		enums.GroupJoinRequestStatusPending,
		recipientID,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	notifications := make([]models.NotificationResponse, 0)
	for rows.Next() {
		var notification models.NotificationResponse
		var actorID, actorFirstName, actorLastName, actorNickname, actorAvatarPath sql.NullString
		var actionable int
		if err := rows.Scan(
			&notification.ID,
			&notification.Type,
			&notification.IsRead,
			&notification.CreatedAt,
			&actorID,
			&actorFirstName,
			&actorLastName,
			&actorNickname,
			&actorAvatarPath,
			&notification.FollowRequestID,
			&notification.GroupInvitationID,
			&notification.GroupJoinRequestID,
			&notification.GroupEventID,
			&notification.GroupID,
			&notification.GroupTitle,
			&actionable,
		); err != nil {
			return nil, 0, err
		}
		if actorID.Valid {
			actor := models.ChatUser{
				ID:        actorID.String,
				FirstName: actorFirstName.String,
				LastName:  actorLastName.String,
			}
			if actorNickname.Valid {
				nickname := actorNickname.String
				actor.Nickname = &nickname
			}
			if actorAvatarPath.Valid {
				actor.AvatarPath = helpers.PublicMediaPath(&actorAvatarPath.String)
			}
			notification.Actor = &actor
		}
		notification.Actionable = actionable == 1
		notifications = append(notifications, notification)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	var unreadCount int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM notifications
		WHERE recipient_id = ? AND is_read = 0
	`, recipientID).Scan(&unreadCount); err != nil {
		return nil, 0, err
	}

	return notifications, unreadCount, nil
}

func markRead(db *sql.DB, recipientID, notificationID string) (bool, error) {
	result, err := db.Exec(`
		UPDATE notifications
		SET is_read = 1,
			read_at = COALESCE(read_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		WHERE id = ? AND recipient_id = ?
	`, notificationID, recipientID)
	if err != nil {
		return false, err
	}
	updated, err := result.RowsAffected()
	return updated > 0, err
}

func markAllRead(db *sql.DB, recipientID string) error {
	_, err := db.Exec(`
		UPDATE notifications
		SET is_read = 1,
			read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		WHERE recipient_id = ? AND is_read = 0
	`, recipientID)
	return err
}
