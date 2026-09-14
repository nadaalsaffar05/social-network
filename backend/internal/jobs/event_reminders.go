package jobs

import (
	"database/sql"

	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/notifications"
)

const eventReminderWindow = "+1 hour"

type eventReminder struct {
	recipientID string
	eventID     string
	creatorID   string
}

func (s *Scheduler) createEventReminders() error {
	rows, err := s.db.Query(`
		SELECT DISTINCT member.user_id, event.id, event.creator_id
		FROM group_events event
		JOIN group_members member ON member.group_id = event.group_id
		WHERE member.status = ?
			AND member.user_id <> event.creator_id
			AND datetime(event.starts_at) > datetime('now')
			AND datetime(event.starts_at) <= datetime('now', ?)
	`, enums.GroupMembershipStatusActive, eventReminderWindow)
	if err != nil {
		return err
	}
	defer rows.Close()

	items := make([]eventReminder, 0)
	for rows.Next() {
		var item eventReminder
		if err := rows.Scan(&item.recipientID, &item.eventID, &item.creatorID); err != nil {
			return err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	return helpers.WithTx(s.db, func(tx *sql.Tx) error {
		for _, item := range items {
			if err := notifications.CreateIgnoringDuplicate(tx, notifications.CreateInput{
				RecipientID:  item.recipientID,
				ActorID:      item.creatorID,
				Type:         enums.NotificationTypeEventReminder,
				GroupEventID: &item.eventID,
			}); err != nil {
				return err
			}
		}
		return nil
	})
}
