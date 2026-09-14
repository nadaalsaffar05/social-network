package jobs

import (
	"database/sql"
	"time"

	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/notifications"
)

type birthdayNotification struct {
	recipientID string
	actorID     string
}

func (s *Scheduler) createBirthdayNotifications() error {
	birthdayDate := time.Now().In(bahrainLocation).Format("01-02")

	rows, err := s.db.Query(`
		SELECT DISTINCT recipient_follow.follower_id, birthday_user.id
		FROM follows recipient_follow
		JOIN follows birthday_user_follow
			ON birthday_user_follow.follower_id = recipient_follow.following_id
			AND birthday_user_follow.following_id = recipient_follow.follower_id
		JOIN users birthday_user ON birthday_user.id = recipient_follow.following_id
		WHERE recipient_follow.follower_id <> recipient_follow.following_id
			AND strftime('%m-%d', birthday_user.date_of_birth) = ?
	`, birthdayDate)
	if err != nil {
		return err
	}
	defer rows.Close()

	items := make([]birthdayNotification, 0)
	for rows.Next() {
		var item birthdayNotification
		if err := rows.Scan(&item.recipientID, &item.actorID); err != nil {
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
				RecipientID: item.recipientID,
				ActorID:     item.actorID,
				Type:        enums.NotificationTypeBirthday,
			}); err != nil {
				return err
			}
		}
		return nil
	})
}
