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

func getGroupUserState(db *sql.DB, groupID string, userID string) (bool, bool, bool, error) {
	var isMember bool
	var hasPendingRequest bool
	var hasPendingInvite bool
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
			),
			EXISTS (
				SELECT 1
				FROM group_invitations
				WHERE group_id = ?
					AND invited_user_id = ?
					AND status = ?
			)
	`, groupID, userID, enums.GroupMembershipStatusActive, groupID, userID, enums.GroupJoinRequestStatusPending, groupID, userID, enums.GroupInvitationStatusPending).Scan(&isMember, &hasPendingRequest, &hasPendingInvite)
	return isMember, hasPendingRequest, hasPendingInvite, err
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

func cancelJoinRequest(db *sql.DB, groupID string, userID string) error {
	_, err := db.Exec(`
		UPDATE group_join_requests
		SET status = ?,
		    responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE group_id = ?
		  AND user_id = ?
		  AND status = ?
	`, enums.GroupJoinRequestStatusCancelled, groupID, userID, enums.GroupJoinRequestStatusPending)
	return err
}

func createInvite(db *sql.DB, inviteID string, groupID string, inviterID string, invitedUserID string) error {
	_, err := db.Exec(`
	INSERT INTO group_invitations(id, group_id, inviter_id, invited_user_id, status)
	VALUES(?, ?, ?, ?, ?)
	`, inviteID, groupID, inviterID, invitedUserID, enums.GroupInvitationStatusPending)
	return err
}

func getGroupInvites(db *sql.DB, groupID string, userID string, isCreator bool) ([]models.GroupInvitationResponse, error) {
	rows, err := db.Query(`
		SELECT
			gi.id,
			gi.group_id,

			gi.inviter_id,
			inviter.first_name,
			inviter.last_name,
			inviter_profile.nickname,

			gi.invited_user_id,
			invited.first_name,
			invited.last_name,
			invited_profile.nickname,

			gi.status,
			gi.created_at
		FROM group_invitations gi

		JOIN users inviter
			ON inviter.id = gi.inviter_id

		JOIN profiles inviter_profile
			ON inviter_profile.user_id = inviter.id

		JOIN users invited
			ON invited.id = gi.invited_user_id

		JOIN profiles invited_profile
			ON invited_profile.user_id = invited.id

		WHERE gi.group_id = ?
		  AND gi.status = ?
		  AND (? OR gi.inviter_id = ?)

		ORDER BY gi.created_at DESC
	`,
		groupID,
		enums.GroupInvitationStatusPending,
		isCreator,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invites := make([]models.GroupInvitationResponse, 0)
	for rows.Next() {
		var invite models.GroupInvitationResponse
		err := rows.Scan(
			&invite.InviteID,
			&invite.GroupID,

			&invite.InviterID,
			&invite.InviterFirstName,
			&invite.InviterLastName,
			&invite.InviterNickname,

			&invite.InvitedUserID,
			&invite.InvitedUserFirstName,
			&invite.InvitedUserLastName,
			&invite.InvitedUserNickname,

			&invite.Status,
			&invite.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		invites = append(invites, invite)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return invites, nil
}

func getPendingInviteByID(db *sql.DB, inviteID string, groupID string) (models.GroupInvitationResponse, error) {
	var invite models.GroupInvitationResponse
	err := db.QueryRow(`
		SELECT
			gi.id,
			gi.group_id,
			gi.inviter_id,
			inviter.first_name,
			inviter.last_name,
			inviter_profile.nickname,
			gi.invited_user_id,
			invited.first_name,
			invited.last_name,
			invited_profile.nickname,
			gi.status,
			gi.created_at
		FROM group_invitations gi
		JOIN users inviter
			ON inviter.id = gi.inviter_id
		JOIN profiles inviter_profile
			ON inviter_profile.user_id = inviter.id
		JOIN users invited
			ON invited.id = gi.invited_user_id
		JOIN profiles invited_profile
			ON invited_profile.user_id = invited.id
		WHERE gi.id = ?
		  AND gi.group_id = ?
		  AND gi.status = ?
	`, inviteID, groupID, enums.GroupInvitationStatusPending).Scan(
		&invite.InviteID,
		&invite.GroupID,
		&invite.InviterID,
		&invite.InviterFirstName,
		&invite.InviterLastName,
		&invite.InviterNickname,
		&invite.InvitedUserID,
		&invite.InvitedUserFirstName,
		&invite.InvitedUserLastName,
		&invite.InvitedUserNickname,
		&invite.Status,
		&invite.CreatedAt,
	)

	return invite, err
}

func getPendingInviteByIDForUser(db *sql.DB, inviteID string, userID string) (models.GroupInvitationResponse, error) {
	var invite models.GroupInvitationResponse
	err := db.QueryRow(`
		SELECT
			id,
			group_id,
			inviter_id,
			invited_user_id,
			status,
			created_at
		FROM group_invitations
		WHERE id = ?
		  AND invited_user_id = ?
		  AND status = ?
	`, inviteID, userID, enums.GroupInvitationStatusPending).Scan(
		&invite.InviteID,
		&invite.GroupID,
		&invite.InviterID,
		&invite.InvitedUserID,
		&invite.Status,
		&invite.CreatedAt,
	)

	return invite, err
}

func getUserInvites(db *sql.DB, userID string) ([]models.UserGroupInvitationResponse, error) {
	rows, err := db.Query(`
		SELECT
			gi.id,
			gi.group_id,
			g.title,
			gi.inviter_id,
			u.first_name,
			u.last_name,
			p.nickname,
			gi.status,
			gi.created_at
		FROM group_invitations gi
		JOIN groups g
			ON g.id = gi.group_id
		JOIN users u
			ON u.id = gi.inviter_id
		JOIN profiles p
			ON p.user_id = u.id
		WHERE gi.invited_user_id = ?
		  AND gi.status = ?
		ORDER BY gi.created_at DESC
	`, userID, enums.GroupInvitationStatusPending,
	)

	if err != nil {
		return nil, err
	}

	defer rows.Close()

	invites := make([]models.UserGroupInvitationResponse, 0)
	for rows.Next() {
		var invite models.UserGroupInvitationResponse
		err := rows.Scan(&invite.InviteID,
			&invite.GroupID,
			&invite.GroupTitle,
			&invite.InviterID,
			&invite.InviterFirstName,
			&invite.InviterLastName,
			&invite.InviterNickname,
			&invite.Status,
			&invite.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		invites = append(invites, invite)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return invites, nil
}

func respondToInvite(db *sql.DB, action string, invite models.GroupInvitationResponse) error {
	var newStatus enums.GroupInvitationStatus
	switch action {
	case "accept":
		newStatus = enums.GroupInvitationStatusAccepted
	case "decline":
		newStatus = enums.GroupInvitationStatusDeclined
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE group_invitations
		SET status = ?,
		    responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE id = ?
		  AND group_id = ?
		  AND invited_user_id = ?
		  AND status = ?
	`, newStatus, invite.InviteID, invite.GroupID, invite.InvitedUserID, enums.GroupInvitationStatusPending)

	if err != nil {
		return err
	}

	if newStatus == enums.GroupInvitationStatusAccepted {
		_, err = tx.Exec(`
			INSERT INTO group_members (
				group_id,
				user_id,
				role,
				status
			)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(group_id, user_id)
			DO UPDATE SET status = excluded.status
		`, invite.GroupID, invite.InvitedUserID, enums.GroupMemberRoleMember, enums.GroupMembershipStatusActive,
		)

		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func cancelInvite(db *sql.DB, inviteID string, groupID string) error {
	_, err := db.Exec(`
		UPDATE group_invitations
		SET status = ?,
		    responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE id = ?
		  AND group_id = ?
		  AND status = ?
	`, enums.GroupInvitationStatusCancelled, inviteID, groupID, enums.GroupInvitationStatusPending)
	return err
}
