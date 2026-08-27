package feed

import (
	"database/sql"
	"social-network/internal/enums"
)

func createPost(
	db *sql.DB,
	id string,
	authorID string,
	content string,
	privacy enums.PostPrivacy,
) error {
	_, err := db.Exec(`
		INSERT INTO posts (
			id,
			author_id,
			content,
			privacy
		)
		VALUES (?, ?, ?, ?)
	`, id, authorID, content, privacy)

	return err
}