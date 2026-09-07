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

func getGroups(db *sql.DB) ([]models.GroupResponse, error) {
	rows, err := db.Query(`
		SELECT id, creator_id, title, description, created_at
		FROM groups
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.GroupResponse
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
	`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.GroupMemberResponse
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
			),
			EXISTS (
				SELECT 1
				FROM group_join_requests
				WHERE group_id = ?
				AND user_id = ?
				AND status = ?
			)
	`, groupID, userID, groupID, userID, enums.GroupJoinRequestStatusPending).Scan(&isMember, &hasPendingRequest)
	return isMember, hasPendingRequest, err
}

func createJoinRequest(db *sql.DB, joinRequestID string, groupID string, userID string) error {
	_, err := db.Exec(`
		INSERT INTO group_join_requests (id, group_id, user_id, status)
		VALUES (?, ?, ?, ?)
	`, joinRequestID, groupID, userID, enums.GroupJoinRequestStatusPending)
	return err
}
