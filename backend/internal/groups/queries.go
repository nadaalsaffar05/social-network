package groups

import (
	"database/sql"
	"social-network/internal/enums"
	"social-network/internal/models"
)

func createGroup(db *sql.DB, id string, creatorID string, title string, description string) (models.GroupResponse, error) {
	var group models.GroupResponse
	err := db.QueryRow(`
		INSERT INTO groups (id, creator_id, title, description)
		VALUES (?, ?, ?, ?)
		RETURNING id, creator_id, title, description, created_at
	`, id, creatorID, title, description).Scan(&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.CreatedAt)
	return group, err
}

func getAllGroups(db *sql.DB) ([]models.GroupResponse, error) {
	rows, err := db.Query(`
		SELECT id, creator_id, title, description, created_at
		FROM groups
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := make([]models.GroupResponse, 0)
	for rows.Next() {
		var group models.GroupResponse
		if err := rows.Scan(&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.CreatedAt); err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return groups, nil
}

func getGroupByID(db *sql.DB, groupID string) (models.GroupDetailsResponse, error) {
	var group models.GroupDetailsResponse
	err := db.QueryRow(`
		SELECT id, creator_id, title, description, created_at
		FROM groups
		WHERE id = ?
	`, groupID).Scan(&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.CreatedAt)
	return group, err
}

func getGroupMembers(db *sql.DB, groupID string) ([]models.GroupMemberResponse, error) {
	rows, err := db.Query(`
		SELECT u.id, u.first_name, u.last_name, p.nickname, gm.role, gm.joined_at
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		WHERE gm.group_id = ?
			AND gm.status = ?
	`, groupID, enums.GroupMembershipStatusActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := make([]models.GroupMemberResponse, 0)
	for rows.Next() {
		var member models.GroupMemberResponse
		if err := rows.Scan(&member.UserID, &member.FirstName, &member.LastName, &member.Nickname, &member.Role, &member.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return members, nil
}

func getGroupUserState(db *sql.DB, groupID string, userID string) (bool, bool, error) {
	var isMember bool
	var hasPendingRequest bool
	err := db.QueryRow(`
		SELECT
			EXISTS (
				SELECT 1
				FROM group_members
				WHERE group_id = ?
					AND user_id = ?
					AND status = ?
			),
			EXISTS (
				SELECT 1
				FROM group_join_requests
				WHERE group_id = ?
					AND user_id = ?
					AND status = ?
			)
	`, groupID, userID, enums.GroupMembershipStatusActive, groupID, userID, enums.GroupJoinRequestStatusPending).Scan(&isMember, &hasPendingRequest)
	return isMember, hasPendingRequest, err
}

func createJoinRequest(db *sql.DB, joinRequestID string, groupID string, userID string) error {
	_, err := db.Exec(`
		INSERT INTO group_join_requests (id, group_id, user_id, status)
		VALUES (?, ?, ?, ?)
	`, joinRequestID, groupID, userID, enums.GroupJoinRequestStatusPending)
	return err
}

func updateMembershipStatus(db *sql.DB, groupID string, userID string) error {
	_, err := db.Exec(`
		UPDATE group_members
		SET status = ?
		WHERE group_id = ?
			AND user_id = ?
			AND status = ?
	`, enums.GroupMembershipStatusRemoved, groupID, userID, enums.GroupMembershipStatusActive)
	return err
}

func getJoinRequests(db *sql.DB, groupID string) ([]models.GroupJoinRequestResponse, error) {
	rows, err := db.Query(`
		SELECT gjr.id, gjr.group_id, gjr.user_id, u.first_name, u.last_name, p.nickname, gjr.status, gjr.created_at
		FROM group_join_requests gjr
		JOIN users u on gjr.user_id = u.id
		LEFT JOIN profiles p on u.id = p.user_id
		WHERE gjr.group_id = ?
			AND gjr.status = ?
	`, groupID, enums.GroupJoinRequestStatusPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	joinRequests := make([]models.GroupJoinRequestResponse, 0)
	for rows.Next() {
		var joinRequest models.GroupJoinRequestResponse
		if err := rows.Scan(&joinRequest.RequestID, &joinRequest.GroupID, &joinRequest.UserID, &joinRequest.FirstName, &joinRequest.LastName, &joinRequest.Nickname, &joinRequest.Status, &joinRequest.CreatedAt); err != nil {
			return nil, err
		}
		joinRequests = append(joinRequests, joinRequest)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return joinRequests, nil
}

func getPendingJoinRequestByID(db *sql.DB, groupID string, requestID string) (models.GroupJoinRequestResponse, error) {
	var joinRequest models.GroupJoinRequestResponse
	err := db.QueryRow(`
		SELECT gjr.id, gjr.group_id, gjr.user_id, u.first_name, u.last_name, p.nickname, gjr.status, gjr.created_at
		FROM group_join_requests gjr
		JOIN users u ON gjr.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		WHERE gjr.id = ?
			AND gjr.group_id = ?
			AND gjr.status = ?
	`, requestID, groupID, enums.GroupJoinRequestStatusPending).Scan(&joinRequest.RequestID, &joinRequest.GroupID, &joinRequest.UserID, &joinRequest.FirstName, &joinRequest.LastName, &joinRequest.Nickname, &joinRequest.Status, &joinRequest.CreatedAt)

	return joinRequest, err
}

func respondToJoinRequest(db *sql.DB, action string, joinRequest models.GroupJoinRequestResponse) error {
	var newStatus enums.GroupJoinRequestStatus
	switch action {
	case "accept":
		newStatus = enums.GroupJoinRequestStatusAccepted
	case "decline":
		newStatus = enums.GroupJoinRequestStatusDeclined
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE group_join_requests
		SET status = ?,
			responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE id = ?
			AND group_id = ?
			AND status = ?
	`, newStatus, joinRequest.RequestID, joinRequest.GroupID, enums.GroupJoinRequestStatusPending)
	if err != nil {
		return err
	}

	if newStatus == enums.GroupJoinRequestStatusAccepted {
		_, err = tx.Exec(`
			INSERT INTO group_members (group_id, user_id, role, status)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(group_id, user_id)
			DO UPDATE SET status = excluded.status
		`, joinRequest.GroupID, joinRequest.UserID, enums.GroupMemberRoleMember, enums.GroupMembershipStatusActive)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
