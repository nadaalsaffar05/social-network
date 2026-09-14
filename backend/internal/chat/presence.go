package chat

import (
	"database/sql"
	"strings"

	"social-network/internal/helpers"
	"social-network/internal/models"
)

func updateLastSeen(db *sql.DB, userID string) (*string, error) {
	var lastSeenAt string
	err := db.QueryRow(`
		INSERT INTO user_presence (user_id, last_seen_at)
		VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		ON CONFLICT(user_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
		RETURNING last_seen_at
	`, userID).Scan(&lastSeenAt)
	if err != nil {
		return nil, err
	}
	return &lastSeenAt, nil
}

func getOnlineUsers(db *sql.DB, currentUserID string, userIDs []string) ([]models.OnlineUser, error) {
	users := make([]models.OnlineUser, 0, len(userIDs))
	if len(userIDs) == 0 {
		return users, nil
	}

	placeholders := strings.TrimRight(strings.Repeat("?,", len(userIDs)), ",")
	args := make([]any, 0, len(userIDs)+2)
	for _, userID := range userIDs {
		args = append(args, userID)
	}
	args = append(args, currentUserID, currentUserID)

	rows, err := db.Query(`
		SELECT user.id, user.first_name, user.last_name, profile.nickname, media.file_path
		FROM users user
		JOIN profiles profile ON profile.user_id = user.id
		LEFT JOIN profile_avatars avatar ON avatar.user_id = user.id
		LEFT JOIN media ON media.id = avatar.media_id
		WHERE user.id IN (`+placeholders+`)
		  AND user.id != ?
		  AND EXISTS (
			SELECT 1
			FROM follows current_user_follow
			JOIN follows reverse_follow
				ON reverse_follow.follower_id = current_user_follow.following_id
				AND reverse_follow.following_id = current_user_follow.follower_id
			WHERE current_user_follow.follower_id = ?
			  AND current_user_follow.following_id = user.id
		  )
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var user models.OnlineUser
		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.Nickname, &user.AvatarPath); err != nil {
			return nil, err
		}
		user.AvatarPath = helpers.PublicMediaPath(user.AvatarPath)
		users = append(users, user)
	}
	return users, rows.Err()
}
