package api

import (
	"database/sql"
	"strings"

	"social-network/internal/helpers"
	"social-network/internal/models"
)

func getProfileByID(db *sql.DB, userID string) (*models.ProfileResponse, error) {
	var profile models.ProfileResponse
	err := db.QueryRow(`
		SELECT
			u.id,
			u.email,
			u.first_name,
			u.last_name,
			u.date_of_birth,
			p.nickname,
			p.about_me,
			p.privacy,
			m.file_path
		FROM users u
		JOIN profiles p ON p.user_id = u.id
		LEFT JOIN profile_avatars pa ON pa.user_id = u.id
		LEFT JOIN media m ON m.id = pa.media_id
		WHERE u.id = ?
	`, userID).Scan(
		&profile.ID,
		&profile.Email,
		&profile.FirstName,
		&profile.LastName,
		&profile.DateOfBirth,
		&profile.Nickname,
		&profile.AboutMe,
		&profile.Privacy,
		&profile.AvatarPath,
	)
	if err != nil {
		return nil, err
	}
	profile.AvatarPath = helpers.PublicMediaPath(profile.AvatarPath)
	return &profile, nil
}

func getProfileFollowCounts(db *sql.DB, userID string) (int, int, error) {
	var followers, following int
	err := db.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM follows WHERE following_id = ?),
			(SELECT COUNT(*) FROM follows WHERE follower_id = ?)
	`, userID, userID).Scan(&followers, &following)
	return followers, following, err
}

func searchProfileUsers(db *sql.DB, query string) ([]models.FollowUserItem, error) {
	pattern := "%" + strings.ToLower(query) + "%"
	rows, err := db.Query(`
		SELECT user.id, user.email, user.first_name, user.last_name, profile.nickname, media.file_path, profile.privacy
		FROM users user
		JOIN profiles profile ON profile.user_id = user.id
		LEFT JOIN profile_avatars avatar ON avatar.user_id = user.id
		LEFT JOIN media ON media.id = avatar.media_id
		WHERE LOWER(user.first_name) LIKE ?
			OR LOWER(user.last_name) LIKE ?
			OR LOWER(COALESCE(profile.nickname, '')) LIKE ?
		ORDER BY user.first_name, user.last_name
		LIMIT 20
	`, pattern, pattern, pattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.FollowUserItem, 0)
	for rows.Next() {
		var user models.FollowUserItem
		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.Nickname,
			&user.AvatarPath,
			&user.Privacy,
		); err != nil {
			return nil, err
		}
		user.AvatarPath = helpers.PublicMediaPath(user.AvatarPath)
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func nicknameTaken(db *sql.DB, nickname, excludedUserID string) (bool, error) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM profiles
			WHERE LOWER(nickname) = LOWER(?) AND user_id != ?
		)
	`, nickname, excludedUserID).Scan(&exists)
	return exists, err
}
