package helpers

import "database/sql"

func IsFollowing(db *sql.DB, followerID, followingID string) (bool, error) {
	var exists bool

	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM follows
			WHERE follower_id = ?
			  AND following_id = ?
		)
	`, followerID, followingID).Scan(&exists)

	return exists, err
}
