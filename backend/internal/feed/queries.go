package feed

import (
	"database/sql"
	"social-network/internal/enums"
)

func createPost(
	tx *sql.Tx,
	id string,
	authorID string,
	content string,
	privacy enums.PostPrivacy,
) (string, error) {
	var createdAt string
	err := tx.QueryRow(`
		INSERT INTO posts (
			id,
			author_id,
			content,
			privacy
		)
		VALUES (?, ?, ?, ?)
		RETURNING created_at
	`, id, authorID, content, privacy).Scan(&createdAt)

	return createdAt, err
}

func addPostVisibility(
	tx *sql.Tx,
	postID string,
	userID string,
) error {
	_, err := tx.Exec(`
		INSERT INTO post_visibility (post_id, user_id)
		VALUES (?, ?)
	`, postID, userID)

	return err
}

func getFeedPosts(db *sql.DB, viewerID string) (*sql.Rows, error) {
	return db.Query(`
        SELECT p.id, p.author_id, p.content, p.privacy, p.created_at
        FROM posts p
        WHERE p.is_active = 1
          AND p.group_id IS NULL
          AND (
            p.privacy = 1000
            OR p.author_id = ?
            OR (
              p.privacy = 1010
              AND EXISTS (
                SELECT 1 FROM follows f
                WHERE f.follower_id = ?
                  AND f.following_id = p.author_id
              )
            )
            OR (
              p.privacy = 1020
              AND EXISTS (
                SELECT 1 FROM post_visibility pv
                WHERE pv.post_id = p.id
                  AND pv.user_id = ?
              )
            )
          )
        ORDER BY p.created_at DESC
    `, viewerID, viewerID, viewerID)
}
