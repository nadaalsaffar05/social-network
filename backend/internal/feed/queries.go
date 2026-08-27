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

func getPostMedia(db *sql.DB, postID string) ([]string, error) {
	rows, err := db.Query(`
		SELECT m.file_path
		FROM post_media pm
		JOIN media m ON m.id = pm.media_id
		WHERE pm.post_id = ?
		ORDER BY pm.position ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	paths := make([]string, 0)
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			return nil, err
		}
		paths = append(paths, path)
	}

	return paths, rows.Err()
}

func addPostMedia(
	tx *sql.Tx,
	postID string,
	mediaID string,
	uploaderID string,
	fileName string,
	filePath string,
	mimeType enums.MediaMIMEType,
	fileSize int64,
	position int,
) error {
	_, err := tx.Exec(`
		INSERT INTO media (id, uploader_id, file_name, file_path, mime_type, file_size)
		VALUES (?, ?, ?, ?, ?, ?)
	`, mediaID, uploaderID, fileName, filePath, string(mimeType), fileSize)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`
		INSERT INTO post_media (post_id, media_id, position)
		VALUES (?, ?, ?)
	`, postID, mediaID, position)
	return err
}
