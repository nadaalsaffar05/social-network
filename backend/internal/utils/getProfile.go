package utils

import (
	"database/sql"
	"social-network/internal/models"
)

func GetProfileObject(database *sql.DB, userID string) (*models.ProfileResponse, error) {
	var profile models.ProfileResponse

	err := database.QueryRow(`
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

	return &profile, nil
}
