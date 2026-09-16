package profile

import (
	"database/sql"
	"errors"

	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

const followUserColumns = `
	u.id,
	u.email,
	u.first_name,
	u.last_name,
	p.nickname,
	p.privacy,
	m.file_path`

func getFollowers(db *sql.DB, userID string) ([]models.FollowUserItem, error) {
	return getFollowUsers(db, userID, `
		SELECT `+followUserColumns+`
		FROM follows f
		JOIN users u ON u.id = f.follower_id
		JOIN profiles p ON p.user_id = u.id
		LEFT JOIN profile_avatars pa ON pa.user_id = u.id
		LEFT JOIN media m ON m.id = pa.media_id
		WHERE f.following_id = ?
		ORDER BY f.created_at DESC`)
}

func getFollowing(db *sql.DB, userID string) ([]models.FollowUserItem, error) {
	return getFollowUsers(db, userID, `
		SELECT `+followUserColumns+`
		FROM follows f
		JOIN users u ON u.id = f.following_id
		JOIN profiles p ON p.user_id = u.id
		LEFT JOIN profile_avatars pa ON pa.user_id = u.id
		LEFT JOIN media m ON m.id = pa.media_id
		WHERE f.follower_id = ?
		ORDER BY f.created_at DESC`)
}

func getFollowUsers(db *sql.DB, userID, query string) ([]models.FollowUserItem, error) {
	rows, err := db.Query(query, userID)
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
			&user.Privacy,
			&user.AvatarPath,
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

func getFollowRequests(db *sql.DB, recipientID string) ([]models.FollowRequestItem, error) {
	rows, err := db.Query(`
		SELECT
			fr.id,
			u.id,
			u.email,
			u.first_name,
			u.last_name,
			p.nickname,
			p.privacy,
			m.file_path,
			fr.created_at
		FROM follow_requests fr
		JOIN users u ON u.id = fr.sender_id
		JOIN profiles p ON p.user_id = u.id
		LEFT JOIN profile_avatars pa ON pa.user_id = u.id
		LEFT JOIN media m ON m.id = pa.media_id
		WHERE fr.recipient_id = ? AND fr.status = ?
		ORDER BY fr.created_at DESC
	`, recipientID, enums.FollowRequestStatusPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]models.FollowRequestItem, 0)
	for rows.Next() {
		var request models.FollowRequestItem
		if err := rows.Scan(
			&request.ID,
			&request.SenderID,
			&request.Email,
			&request.FirstName,
			&request.LastName,
			&request.Nickname,
			&request.Privacy,
			&request.AvatarPath,
			&request.CreatedAt,
		); err != nil {
			return nil, err
		}
		request.AvatarPath = helpers.PublicMediaPath(request.AvatarPath)
		requests = append(requests, request)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return requests, nil
}

func getProfilePrivacy(db *sql.DB, userID string) (enums.ProfilePrivacy, error) {
	var privacy enums.ProfilePrivacy
	err := db.QueryRow(`
		SELECT privacy
		FROM profiles
		WHERE user_id = ?
	`, userID).Scan(&privacy)
	return privacy, err
}

func hasFollow(db *sql.DB, followerID, followingID string) (bool, error) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM follows
			WHERE follower_id = ? AND following_id = ?
		)
	`, followerID, followingID).Scan(&exists)
	return exists, err
}

func getPendingFollowRequestID(db *sql.DB, senderID, recipientID string) (string, bool, error) {
	var requestID string
	err := db.QueryRow(`
		SELECT id
		FROM follow_requests
		WHERE sender_id = ? AND recipient_id = ? AND status = ?
	`, senderID, recipientID, enums.FollowRequestStatusPending).Scan(&requestID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return requestID, true, nil
}

func getFollowRequest(db *sql.DB, requestID string) (string, string, enums.FollowRequestStatus, error) {
	var senderID, recipientID string
	var status enums.FollowRequestStatus
	err := db.QueryRow(`
		SELECT sender_id, recipient_id, status
		FROM follow_requests
		WHERE id = ?
	`, requestID).Scan(&senderID, &recipientID, &status)
	return senderID, recipientID, status, err
}
