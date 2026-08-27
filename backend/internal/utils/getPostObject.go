package utils

import (
	"database/sql"
	"social-network/internal/models"
)

func GetPostObject(database *sql.DB, userID string) (*models.PostResponse, error) {
	var post models.PostResponse


	//TODO: change this once query is done!
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
		&post.ID,
		&post.AuthorID,
		&post.Content,
		&post.CreatedAt,
		&post.Privacy,
	)
	if err != nil {
		return nil, err
	}

	return &post, nil
}
