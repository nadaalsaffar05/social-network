package groups

import (
	"database/sql"
	"errors"
	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/google/uuid"
)

type sqlExecer interface {
	Exec(query string, args ...any) (sql.Result, error)
}

type sqlQueryer interface {
	Query(query string, args ...any) (*sql.Rows, error)
}

// groups
func createGroup(db *sql.DB, id string, creatorID string, title string, description string) (models.GroupResponse, error) {
	var group models.GroupResponse
	err := db.QueryRow(`
		INSERT INTO groups
		(id, creator_id, title, description)
		VALUES (?, ?, ?, ?)
		RETURNING id, creator_id, title, description, created_at
	`, id, creatorID, title, description,
	).Scan(&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.CreatedAt)
	return group, err
}

func groupTitleExists(db *sql.DB, title string) (bool, error) {
	var exists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM groups
			WHERE LOWER(title) = LOWER(?)
		)
	`, title).Scan(&exists)

	return exists, err
}

func getAllGroups(db *sql.DB, userID string, filter string, cursor string, limit int) ([]models.GroupDetailsResponse, string, error) {
	cursorCreatedAt := ""
	if cursor != "" {
		err := db.QueryRow(`
		SELECT created_at
		FROM groups
		WHERE id = ?
	`, cursor).Scan(&cursorCreatedAt)
		if err != nil {
			return nil, "", err
		}
	}
	rows, err := db.Query(`
		SELECT
			g.id,
			g.creator_id,
			g.title,
			g.description,
			g.created_at,
			(
    			SELECT COUNT(*)
   				FROM group_members gm
   				WHERE gm.group_id = g.id
       				AND gm.status = ?
			) AS member_count,
			(
				SELECT gm.joined_at
				FROM group_members gm
				WHERE gm.group_id = g.id
					AND gm.user_id = ?
				    AND gm.status = ?
			) AS joined_at,
			EXISTS (
				SELECT 1
				FROM group_members gm
				WHERE gm.group_id = g.id
					AND gm.user_id = ?
					AND gm.status = ?
			) AS is_member,
			EXISTS (
				SELECT 1
				FROM group_join_requests gjr
				WHERE gjr.group_id = g.id
					AND gjr.user_id = ?
					AND gjr.status = ?
			) AS has_pending_request,
			EXISTS (
				SELECT 1
				FROM group_invitations gi
				WHERE gi.group_id = g.id
					AND gi.invited_user_id = ?
					AND gi.status = ?
			) AS has_pending_invite
		FROM groups g
		WHERE
			(
				(
					? = 'mine'
					AND EXISTS (
						SELECT 1
						FROM group_members gm
						WHERE gm.group_id = g.id
							AND gm.user_id = ?
							AND gm.status = ?
					)
				)
				OR
				(
					? = 'discover'
					AND NOT EXISTS (
						SELECT 1
						FROM group_members gm
						WHERE gm.group_id = g.id
							AND gm.user_id = ?
							AND gm.status = ?
					)
				)
			)
			AND (
				? = ''
				OR g.created_at < ?
				OR (g.created_at = ? AND g.id < ?)
			)
		ORDER BY g.created_at DESC, g.id DESC
		LIMIT ?
	`, enums.GroupMembershipStatusActive, userID, enums.GroupMembershipStatusActive, userID, enums.GroupMembershipStatusActive, userID, enums.GroupJoinRequestStatusPending, userID, enums.GroupInvitationStatusPending,
		filter, userID, enums.GroupMembershipStatusActive, filter, userID, enums.GroupMembershipStatusActive, cursor, cursorCreatedAt,
		cursorCreatedAt, cursor, limit+1)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	groups := make([]models.GroupDetailsResponse, 0)
	for rows.Next() {
		var group models.GroupDetailsResponse
		if err := rows.Scan(&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.CreatedAt, &group.MemberCount,
			&group.JoinedAt, &group.IsMember, &group.HasPendingRequest, &group.HasPendingInvite); err != nil {
			return nil, "", err
		}

		groups = append(groups, group)
	}

	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if len(groups) > limit {
		groups = groups[:limit]
		nextCursor = groups[len(groups)-1].ID
	}

	return groups, nextCursor, nil
}

func getGroupByID(db *sql.DB, groupID string) (models.GroupDetailsResponse, error) {
	var group models.GroupDetailsResponse
	err := db.QueryRow(`
        SELECT
            g.id,
            g.creator_id,
            g.title,
            g.description,
            g.created_at,
            u.first_name,
            u.last_name,
            p.nickname,
            (
                SELECT COUNT(*)
                FROM group_members gm
                WHERE gm.group_id = g.id
                    AND gm.status = ?
            )
        FROM groups g
        JOIN users u ON g.creator_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE g.id = ?
    `, enums.GroupMembershipStatusActive, groupID).Scan(&group.ID, &group.CreatorID, &group.Title, &group.Description, &group.CreatedAt,
		&group.CreatorFirstName, &group.CreatorLastName, &group.CreatorNickname, &group.MemberCount)

	return group, err
}

func getGroupMembers(db *sql.DB, groupID string, cursor string, limit int) ([]models.GroupMemberResponse, string, error) {
	var cursorJoinedAt string
	var cursorRole enums.GroupMemberRole
	if cursor != "" {
		err := db.QueryRow(`
			SELECT joined_at, role
			FROM group_members
			WHERE group_id = ?
				AND user_id = ?
				AND status = ?
		`, groupID, cursor, enums.GroupMembershipStatusActive).Scan(&cursorJoinedAt, &cursorRole)
		if err != nil {
			return nil, "", err
		}
	}
	query := `
		SELECT
			u.id,
			u.first_name,
			u.last_name,
			p.nickname,
			avatar_media.file_path,
			gm.role,
			gm.joined_at
		FROM group_members gm
		JOIN users u ON gm.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		LEFT JOIN profile_avatars avatar
			ON avatar.user_id = u.id
		LEFT JOIN media avatar_media
			ON avatar_media.id = avatar.media_id
		WHERE gm.group_id = ?
			AND gm.status = ?
	`
	args := []any{
		groupID,
		enums.GroupMembershipStatusActive,
	}

	if cursor != "" {
		query += `
			AND (
				CASE WHEN gm.role = ? THEN 0 ELSE 1 END >
					CASE WHEN ? = ? THEN 0 ELSE 1 END
				OR (
					CASE WHEN gm.role = ? THEN 0 ELSE 1 END =
						CASE WHEN ? = ? THEN 0 ELSE 1 END
					AND (
						gm.joined_at < ?
						OR (
							gm.joined_at = ?
							AND gm.user_id < ?
						)
					)
				)
			)
		`

		args = append(args, enums.GroupMemberRoleCreator, cursorRole, enums.GroupMemberRoleCreator,
			enums.GroupMemberRoleCreator, cursorRole, enums.GroupMemberRoleCreator, cursorJoinedAt, cursorJoinedAt, cursor)
	}

	query += `
		ORDER BY
			CASE WHEN gm.role = ? THEN 0 ELSE 1 END,
			gm.joined_at DESC,
			gm.user_id DESC
		LIMIT ?
	`

	args = append(args, enums.GroupMemberRoleCreator, limit+1)

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	members := make([]models.GroupMemberResponse, 0)
	for rows.Next() {
		var member models.GroupMemberResponse
		if err := rows.Scan(&member.UserID, &member.FirstName, &member.LastName, &member.Nickname, &member.AvatarPath, &member.Role, &member.JoinedAt); err != nil {
			return nil, "", err
		}

		members = append(members, member)
	}

	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if len(members) > limit {
		members = members[:limit]
		nextCursor = members[len(members)-1].UserID
	}

	return members, nextCursor, nil
}

func getGroupUserState(db *sql.DB, groupID string, userID string) (bool, bool, bool, *string, error) {
	var isMember bool
	var hasPendingRequest bool
	var hasPendingInvite bool
	var pendingInviteID *string
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
			),
			(
				SELECT id
				FROM group_invitations
				WHERE group_id = ?
					AND invited_user_id = ?
					AND status = ?
				LIMIT 1
			)
	`, groupID, userID, enums.GroupMembershipStatusActive,
		groupID, userID, enums.GroupJoinRequestStatusPending,
		groupID, userID, enums.GroupInvitationStatusPending,
		groupID, userID, enums.GroupInvitationStatusPending,
	).Scan(&isMember, &hasPendingRequest, &hasPendingInvite, &pendingInviteID)

	return isMember, hasPendingRequest, hasPendingInvite, pendingInviteID, err
}

//////////////////////////////////////////////////////////////////////////////

// join/leave
func createJoinRequest(db sqlExecer, joinRequestID string, groupID string, userID string) error {
	_, err := db.Exec(`
		INSERT INTO group_join_requests (id, group_id, user_id, status)
		VALUES (?, ?, ?, ?)
	`, joinRequestID, groupID, userID, enums.GroupJoinRequestStatusPending)
	return err
}

func markRemoved(db *sql.DB, groupID string, userID string) (int64, error) {
	result, err := db.Exec(`
		UPDATE group_members
		SET status = ?
		WHERE group_id = ?
			AND user_id = ?
			AND status = ?
	`, enums.GroupMembershipStatusRemoved, groupID, userID, enums.GroupMembershipStatusActive)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

func getJoinRequests(db *sql.DB, groupID string, cursor string, limit int) ([]models.GroupJoinRequestResponse, string, int, error) {
	args := []any{
		groupID,
		enums.GroupJoinRequestStatusPending,
	}

	var total int

	err := db.QueryRow(`
		SELECT COUNT(*)
		FROM group_join_requests
		WHERE group_id = ?
			AND status = ?
	`,
		groupID,
		enums.GroupJoinRequestStatusPending,
	).Scan(&total)
	if err != nil {
		return nil, "", 0, err
	}

	query := `
		SELECT gjr.id, gjr.group_id, gjr.user_id, u.first_name, u.last_name, p.nickname, avatar_media.file_path, gjr.status, gjr.created_at
		FROM group_join_requests gjr
		JOIN users u ON gjr.user_id = u.id
		LEFT JOIN profiles p ON u.id = p.user_id
		LEFT JOIN profile_avatars avatar
			ON avatar.user_id = u.id
		LEFT JOIN media avatar_media
			ON avatar_media.id = avatar.media_id
		WHERE gjr.group_id = ?
			AND gjr.status = ?
	`
	if cursor != "" {
		var cursorCreatedAt string
		err := db.QueryRow(`
			SELECT created_at
			FROM group_join_requests
			WHERE id = ?
				AND group_id = ?
				AND status = ?
		`, cursor, groupID, enums.GroupJoinRequestStatusPending).Scan(&cursorCreatedAt)
		if err != nil {
			return nil, "", 0, err
		}

		query += `
			AND (
				gjr.created_at < ?
				OR (gjr.created_at = ? AND gjr.id < ?)
			)
		`
		args = append(args, cursorCreatedAt, cursorCreatedAt, cursor)
	}

	query += `
		ORDER BY gjr.created_at DESC, gjr.id DESC
		LIMIT ?
	`

	args = append(args, limit+1)
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()

	joinRequests := make([]models.GroupJoinRequestResponse, 0)
	for rows.Next() {
		var joinRequest models.GroupJoinRequestResponse
		if err := rows.Scan(&joinRequest.RequestID, &joinRequest.GroupID, &joinRequest.UserID, &joinRequest.FirstName,
			&joinRequest.LastName, &joinRequest.Nickname, &joinRequest.AvatarPath, &joinRequest.Status, &joinRequest.CreatedAt); err != nil {
			return nil, "", 0, err
		}

		joinRequests = append(joinRequests, joinRequest)
	}

	if err := rows.Err(); err != nil {
		return nil, "", 0, err
	}

	nextCursor := ""
	if len(joinRequests) > limit {
		joinRequests = joinRequests[:limit]
		nextCursor = joinRequests[len(joinRequests)-1].RequestID
	}

	return joinRequests, nextCursor, total, nil
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
	`, requestID, groupID, enums.GroupJoinRequestStatusPending,
	).Scan(&joinRequest.RequestID, &joinRequest.GroupID, &joinRequest.UserID, &joinRequest.FirstName,
		&joinRequest.LastName, &joinRequest.Nickname, &joinRequest.Status, &joinRequest.CreatedAt)

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
	return helpers.WithTx(db, func(tx *sql.Tx) error {
		if _, err := tx.Exec(`
			UPDATE group_join_requests
			SET status = ?,
				responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
			WHERE id = ?
				AND group_id = ?
				AND status = ?
		`, newStatus, joinRequest.RequestID, joinRequest.GroupID, enums.GroupJoinRequestStatusPending); err != nil {
			return err
		}

		if newStatus != enums.GroupJoinRequestStatusAccepted {
			return nil
		}

		_, err := tx.Exec(`
			INSERT INTO group_members
			(group_id, user_id, role, status)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(group_id, user_id)
			DO UPDATE SET status = excluded.status
		`, joinRequest.GroupID, joinRequest.UserID, enums.GroupMemberRoleMember, enums.GroupMembershipStatusActive)
		return err
	})
}

func cancelJoinRequest(db *sql.DB, groupID string, userID string) (int64, error) {
	result, err := db.Exec(`
		UPDATE group_join_requests
		SET status = ?,
		    responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE group_id = ?
		  AND user_id = ?
		  AND status = ?
	`, enums.GroupJoinRequestStatusCancelled, groupID, userID, enums.GroupJoinRequestStatusPending)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

//////////////////////////////////////////////////////////////////////////////

// invite
func createInvite(db sqlExecer, inviteID string, groupID string, inviterID string, invitedUserID string) error {
	_, err := db.Exec(`
	INSERT INTO group_invitations
	(id, group_id, inviter_id, invited_user_id, status)
	VALUES(?, ?, ?, ?, ?)
	`, inviteID, groupID, inviterID, invitedUserID, enums.GroupInvitationStatusPending)
	return err
}

func getGroupInvites(db *sql.DB, groupID string, userID string, isCreator bool, cursor string, limit int) ([]models.GroupInvitationResponse, string, int, error) {
	args := []any{groupID, enums.GroupInvitationStatusPending, isCreator, userID}
	var total int
	err := db.QueryRow(`
		SELECT COUNT(*)
		FROM group_invitations
		WHERE group_id = ?
			AND status = ?
			AND (? OR inviter_id = ?)
	`, groupID, enums.GroupInvitationStatusPending, isCreator, userID).Scan(&total)
	if err != nil {
		return nil, "", 0, err
	}

	query := `
		SELECT
			gi.id,
			gi.group_id,
			gi.inviter_id,
			inviter.first_name,
			inviter.last_name,
			inviter_profile.nickname,
			inviter_avatar_media.file_path,
			gi.invited_user_id,
			invited.first_name,
			invited.last_name,
			invited_profile.nickname,
			invited_avatar_media.file_path,
			gi.status,
			gi.created_at
		FROM group_invitations gi
		JOIN users inviter
			ON inviter.id = gi.inviter_id
		LEFT JOIN profiles inviter_profile
			ON inviter_profile.user_id = inviter.id
		LEFT JOIN profile_avatars inviter_avatar
			ON inviter_avatar.user_id = inviter.id
		LEFT JOIN media inviter_avatar_media
			ON inviter_avatar_media.id = inviter_avatar.media_id
		JOIN users invited
			ON invited.id = gi.invited_user_id
		LEFT JOIN profiles invited_profile
			ON invited_profile.user_id = invited.id
		LEFT JOIN profile_avatars invited_avatar
			ON invited_avatar.user_id = invited.id
		LEFT JOIN media invited_avatar_media
			ON invited_avatar_media.id = invited_avatar.media_id
		WHERE gi.group_id = ?
			AND gi.status = ?
			AND (? OR gi.inviter_id = ?)
	`
	if cursor != "" {
		var cursorCreatedAt string

		err := db.QueryRow(`
			SELECT created_at
			FROM group_invitations
			WHERE id = ?
				AND group_id = ?
				AND status = ?
				AND (? OR inviter_id = ?)
		`, cursor, groupID, enums.GroupInvitationStatusPending, isCreator, userID).Scan(&cursorCreatedAt)
		if err != nil {
			return nil, "", 0, err
		}

		query += `
			AND (
				gi.created_at < ?
				OR (gi.created_at = ? AND gi.id < ?)
			)
		`

		args = append(args, cursorCreatedAt, cursorCreatedAt, cursor)
	}

	query += `
		ORDER BY gi.created_at DESC, gi.id DESC
		LIMIT ?
	`

	args = append(args, limit+1)
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()

	invites := make([]models.GroupInvitationResponse, 0)

	for rows.Next() {
		var invite models.GroupInvitationResponse

		err := rows.Scan(&invite.InviteID, &invite.GroupID,
			&invite.InviterID, &invite.InviterFirstName, &invite.InviterLastName, &invite.InviterNickname,
			&invite.InviterAvatarPath, &invite.InvitedUserID, &invite.InvitedUserFirstName, &invite.InvitedUserLastName,
			&invite.InvitedUserNickname, &invite.InvitedUserAvatarPath, &invite.Status, &invite.CreatedAt)
		if err != nil {
			return nil, "", 0, err
		}

		invites = append(invites, invite)
	}

	if err := rows.Err(); err != nil {
		return nil, "", 0, err
	}

	nextCursor := ""
	if len(invites) > limit {
		invites = invites[:limit]
		nextCursor = invites[len(invites)-1].InviteID
	}

	return invites, nextCursor, total, nil
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
	`, inviteID, groupID, enums.GroupInvitationStatusPending,
	).Scan(&invite.InviteID, &invite.GroupID, &invite.InviterID, &invite.InviterFirstName, &invite.InviterLastName,
		&invite.InviterNickname, &invite.InvitedUserID, &invite.InvitedUserFirstName, &invite.InvitedUserLastName,
		&invite.InvitedUserNickname, &invite.Status, &invite.CreatedAt)

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
	`, inviteID, userID, enums.GroupInvitationStatusPending,
	).Scan(&invite.InviteID, &invite.GroupID, &invite.InviterID, &invite.InvitedUserID, &invite.Status, &invite.CreatedAt)

	return invite, err
}

func getUserInvites(db *sql.DB, userID string, cursor string, limit int) ([]models.UserGroupInvitationResponse, string, int, error) {
	var total int
	err := db.QueryRow(`
		SELECT COUNT(*)
		FROM group_invitations
		WHERE invited_user_id = ?
			AND status = ?
	`, userID, enums.GroupInvitationStatusPending).Scan(&total)
	if err != nil {
		return nil, "", 0, err
	}

	args := []any{userID, enums.GroupInvitationStatusPending}

	query := `
		SELECT
			gi.id,
			gi.group_id,
			g.title,
			gi.inviter_id,
			u.first_name,
			u.last_name,
			p.nickname,
			avatar_media.file_path,
			gi.status,
			gi.created_at
		FROM group_invitations gi
		JOIN groups g
			ON g.id = gi.group_id
		JOIN users u
			ON u.id = gi.inviter_id
		LEFT JOIN profiles p
			ON p.user_id = u.id
		LEFT JOIN profile_avatars avatar
			ON avatar.user_id = u.id
		LEFT JOIN media avatar_media
			ON avatar_media.id = avatar.media_id
		WHERE gi.invited_user_id = ?
			AND gi.status = ?
	`
	if cursor != "" {
		var cursorCreatedAt string
		err := db.QueryRow(`
			SELECT created_at
			FROM group_invitations
			WHERE id = ?
				AND invited_user_id = ?
				AND status = ?
		`, cursor, userID, enums.GroupInvitationStatusPending).Scan(&cursorCreatedAt)
		if err != nil {
			return nil, "", 0, err
		}

		query += `
			AND (
				gi.created_at < ?
				OR (gi.created_at = ? AND gi.id < ?)
			)
		`

		args = append(args, cursorCreatedAt, cursorCreatedAt, cursor)
	}

	query += `
		ORDER BY gi.created_at DESC, gi.id DESC
		LIMIT ?
	`

	args = append(args, limit+1)
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, "", 0, err
	}
	defer rows.Close()

	invites := make([]models.UserGroupInvitationResponse, 0)
	for rows.Next() {
		var invite models.UserGroupInvitationResponse
		err := rows.Scan(&invite.InviteID, &invite.GroupID, &invite.GroupTitle, &invite.InviterID,
			&invite.InviterFirstName, &invite.InviterLastName, &invite.InviterNickname,
			&invite.InviterAvatarPath, &invite.Status, &invite.CreatedAt)
		if err != nil {
			return nil, "", 0, err
		}

		invites = append(invites, invite)
	}

	if err := rows.Err(); err != nil {
		return nil, "", 0, err
	}

	nextCursor := ""
	if len(invites) > limit {
		invites = invites[:limit]
		nextCursor = invites[len(invites)-1].InviteID
	}

	return invites, nextCursor, total, nil
}

func respondToInvite(db *sql.DB, action string, invite models.GroupInvitationResponse) error {
	var newStatus enums.GroupInvitationStatus
	switch action {
	case "accept":
		newStatus = enums.GroupInvitationStatusAccepted
	case "decline":
		newStatus = enums.GroupInvitationStatusDeclined
	}

	return helpers.WithTx(db, func(tx *sql.Tx) error {
		if _, err := tx.Exec(`
			UPDATE group_invitations
			SET status = ?,
			    responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
			WHERE id = ?
			  AND group_id = ?
			  AND invited_user_id = ?
			  AND status = ?
		`, newStatus, invite.InviteID, invite.GroupID, invite.InvitedUserID, enums.GroupInvitationStatusPending); err != nil {
			return err
		}

		if newStatus != enums.GroupInvitationStatusAccepted {
			return nil
		}

		_, err := tx.Exec(`
			INSERT INTO group_members
			(group_id, user_id, role, status)
			VALUES (?, ?, ?, ?)
			ON CONFLICT(group_id, user_id)
			DO UPDATE SET status = excluded.status
		`, invite.GroupID, invite.InvitedUserID, enums.GroupMemberRoleMember, enums.GroupMembershipStatusActive)
		return err
	})
}

func cancelInvite(db *sql.DB, inviteID string, groupID string) (int64, error) {
	result, err := db.Exec(`
		UPDATE group_invitations
		SET status = ?,
		    responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE id = ?
		  AND group_id = ?
		  AND status = ?
	`, enums.GroupInvitationStatusCancelled, inviteID, groupID, enums.GroupInvitationStatusPending)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

//////////////////////////////////////////////////////////////////////////////

// events
func createEvent(db sqlExecer, eventID string, groupID string, creatorID string, title string, description string, startsAt string) error {
	_, err := db.Exec(`
		INSERT INTO group_events
		(id, group_id, creator_id, title, description, starts_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, eventID, groupID, creatorID, title, description, startsAt)
	return err
}

func getAllActiveEvents(db *sql.DB, groupID string, userID string, cursor string, limit int) ([]models.GroupEventResponse, string, error) {
	args := []any{
		userID,
		groupID,
	}
	query := `
		SELECT
			ge.id,
			ge.group_id,
			ge.creator_id,
			u.first_name,
			u.last_name,
			p.nickname,
			avatar_media.file_path,
			ge.title,
			ge.description,
			strftime('%Y-%m-%dT%H:%M:%fZ', ge.starts_at),
			ge.created_at,
			ea.response
		FROM group_events ge
		JOIN users u
			ON u.id = ge.creator_id
		LEFT JOIN profiles p
			ON p.user_id = u.id
		LEFT JOIN profile_avatars avatar
			ON avatar.user_id = u.id
		LEFT JOIN media avatar_media
			ON avatar_media.id = avatar.media_id
		LEFT JOIN event_attendees ea
			ON ea.event_id = ge.id
			AND ea.user_id = ?
		WHERE ge.group_id = ?
			AND datetime(ge.starts_at) >= datetime('now')
	`
	if cursor != "" {
		var cursorStartsAt string

		err := db.QueryRow(`
			SELECT strftime('%Y-%m-%dT%H:%M:%fZ', starts_at)
			FROM group_events
			WHERE id = ?
				AND group_id = ?
		`, cursor, groupID).Scan(&cursorStartsAt)
		if err != nil {
			return nil, "", err
		}
		query += `
			AND (
				datetime(ge.starts_at) > datetime(?)
				OR (
					datetime(ge.starts_at) = datetime(?)
					AND ge.id > ?
				)
			)
		`
		args = append(args, cursorStartsAt, cursorStartsAt, cursor)
	}

	query += `
		ORDER BY datetime(ge.starts_at) ASC, ge.id ASC
		LIMIT ?
	`

	args = append(args, limit+1)
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()
	events := make([]models.GroupEventResponse, 0)
	for rows.Next() {
		var event models.GroupEventResponse
		var response sql.NullInt64
		err := rows.Scan(&event.ID, &event.GroupID, &event.CreatorID, &event.CreatorFirstName, &event.CreatorLastName,
			&event.CreatorNickname, &event.CreatorAvatarPath, &event.Title, &event.Description, &event.StartsAt, &event.CreatedAt, &response)
		if err != nil {
			return nil, "", err
		}

		if response.Valid {
			eventResponse := enums.EventResponse(response.Int64)
			event.MyResponse = &eventResponse
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if len(events) > limit {
		events = events[:limit]
		nextCursor = events[len(events)-1].ID
	}

	return events, nextCursor, nil
}

func getEventByID(db *sql.DB, groupID string, eventID string) (models.GroupEventResponse, error) {
	var event models.GroupEventResponse
	err := db.QueryRow(`
		SELECT
			ge.id,
			ge.group_id,
			ge.creator_id,
			u.first_name,
			u.last_name,
			p.nickname,
			avatar_media.file_path,
			ge.title,
			ge.description,
			strftime('%Y-%m-%dT%H:%M:%fZ', ge.starts_at),
			ge.created_at
		FROM group_events ge
		JOIN users u
			ON u.id = ge.creator_id
		LEFT JOIN profiles p
			ON p.user_id = u.id
		LEFT JOIN profile_avatars avatar
			ON avatar.user_id = u.id
		LEFT JOIN media avatar_media
			ON avatar_media.id = avatar.media_id
		WHERE ge.id = ?
			AND ge.group_id = ?
	`, eventID, groupID,
	).Scan(&event.ID, &event.GroupID, &event.CreatorID, &event.CreatorFirstName, &event.CreatorLastName,
		&event.CreatorNickname, &event.CreatorAvatarPath, &event.Title, &event.Description, &event.StartsAt, &event.CreatedAt)

	return event, err
}

func getEventResponse(db *sql.DB, eventID string, userID string) (enums.EventResponse, bool, error) {
	var response enums.EventResponse
	err := db.QueryRow(`
		SELECT response
		FROM event_attendees
		WHERE event_id = ?
			AND user_id = ?
	`, eventID, userID,
	).Scan(&response)

	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}

	if err != nil {
		return 0, false, err
	}

	return response, true, nil
}

func respondToEvent(db *sql.DB, action string, groupID string, eventID string, userID string) error {
	var newResponse enums.EventResponse
	switch action {
	case "going":
		newResponse = enums.EventResponseGoing
	case "not_going":
		newResponse = enums.EventResponseNotGoing
	}

	_, err := db.Exec(`
		INSERT INTO event_attendees
		(event_id, group_id, user_id, response)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(event_id, user_id)
		DO UPDATE SET
			response = excluded.response,
			responded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
	`, eventID, groupID, userID, newResponse)

	return err
}

//////////////////////////////////////////////////////////////////////////////

// group chat

func getGroupMessages(db *sql.DB, groupID, viewerID, cursor string, limit int) ([]models.GroupMessage, string, error) {
	cursorCreatedAt := ""
	cursorID := int64(0)
	if cursor != "" {
		err := db.QueryRow(`
			SELECT created_at, id
			FROM group_messages
			WHERE public_id = ?
				AND group_id = ?
		`, cursor, groupID).Scan(&cursorCreatedAt, &cursorID)

		if errors.Is(err, sql.ErrNoRows) {
			return nil, "", errInvalidCursor
		}

		if err != nil {
			return nil, "", err
		}
	}

	rows, err := db.Query(`
		SELECT
			gm.public_id,
			gm.group_id,
			gm.sender_id,
			u.first_name,
			u.last_name,
			p.nickname,
			gm.content,
			gm.created_at,
			gm.is_active
		FROM group_messages gm
		JOIN users u
			ON u.id = gm.sender_id
		LEFT JOIN profiles p
			ON p.user_id = u.id
		WHERE gm.group_id = ?
		  AND (
			? = ''
			OR gm.created_at < ?
			OR (gm.created_at = ? AND gm.id < ?)
		  )
		ORDER BY gm.created_at DESC, gm.id DESC
		LIMIT ?
	`, groupID, cursor, cursorCreatedAt, cursorCreatedAt, cursorID, limit+1)

	if err != nil {
		return nil, "", err
	}

	defer rows.Close()

	messages := make([]models.GroupMessage, 0, limit)
	hasMore := false
	for rows.Next() {
		if len(messages) == limit {
			hasMore = true
			break
		}

		var message models.GroupMessage
		err := rows.Scan(&message.PublicID, &message.GroupID, &message.SenderID, &message.SenderFirstName,
			&message.SenderLastName, &message.SenderNickname, &message.Content, &message.CreatedAt, &message.IsActive)

		if err != nil {
			return nil, "", err
		}

		messages = append(messages, message)
	}

	if err := rows.Err(); err != nil {
		return nil, "", err
	}
	if err := attachGroupMessageMetadata(db, messages, viewerID); err != nil {
		return nil, "", err
	}

	nextCursor := ""

	if hasMore && len(messages) > 0 {
		nextCursor = messages[len(messages)-1].PublicID
	}

	return messages, nextCursor, nil
}

func getGroupChatID(db *sql.DB, groupID string) (string, error) {
	var chatID string
	err := db.QueryRow(`
		SELECT id
		FROM group_chats
		WHERE group_id = ?
	`, groupID).Scan(&chatID)

	return chatID, err
}

func createGroupMessage(db *sql.DB, groupID string, senderID string, content string) (models.GroupMessage, error) {
	chatID, err := getGroupChatID(db, groupID)
	if err != nil {
		return models.GroupMessage{}, err
	}

	publicID := uuid.New().String()
	_, err = db.Exec(`
		INSERT INTO group_messages
		(public_id, chat_id, group_id, sender_id, content)
		VALUES (?, ?, ?, ?, ?)
	`, publicID, chatID, groupID, senderID, content)

	if err != nil {
		return models.GroupMessage{}, err
	}

	return getGroupMessageByPublicID(db, groupID, publicID)
}

func getGroupMessageByPublicID(db *sql.DB, groupID string, publicID string) (models.GroupMessage, error) {
	var message models.GroupMessage
	err := db.QueryRow(`
		SELECT
			gm.public_id,
			gm.group_id,
			gm.sender_id,
			u.first_name,
			u.last_name,
			p.nickname,
			gm.content,
			gm.created_at,
			gm.is_active
		FROM group_messages gm
		JOIN users u
			ON u.id = gm.sender_id
		LEFT JOIN profiles p
			ON p.user_id = u.id
		WHERE gm.group_id = ?
		  AND gm.public_id = ?
	`, groupID, publicID,
	).Scan(&message.PublicID, &message.GroupID, &message.SenderID, &message.SenderFirstName, &message.SenderLastName,
		&message.SenderNickname, &message.Content, &message.CreatedAt, &message.IsActive)

	if err != nil {
		return message, err
	}
	message.ReadBy = []models.ChatUser{}
	message.Reactions = []models.MessageReaction{}
	message.ReactionSummary = []models.GroupMessageReaction{}
	return message, nil
}

func getActiveGroupMemberIDs(db sqlQueryer, groupID string) ([]string, error) {
	rows, err := db.Query(`
		SELECT user_id
		FROM group_members
		WHERE group_id = ?
		  AND status = ?
	`, groupID, enums.GroupMembershipStatusActive)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	memberIDs := make([]string, 0)
	for rows.Next() {
		var userID string

		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}

		memberIDs = append(memberIDs, userID)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return memberIDs, nil
}

//////////////////////////////////////////////////////////////////////////////

// group posts
func createGroupPost(
	db *sql.DB, postID string, authorID string, groupID string, content string) error {
	_, err := db.Exec(`
		INSERT INTO posts
		(id, author_id, group_id, content, privacy)
		VALUES (?, ?, ?, ?, ?)
	`, postID, authorID, groupID, content, enums.PostPrivacyGroup)

	return err
}

func getGroupPosts(db *sql.DB, groupID string, viewerID string, cursor string, limit int) ([]models.PostResponse, string, error) {
	cursorCreatedAt := ""
	cursorID := ""
	if cursor != "" {
		err := db.QueryRow(`
			SELECT id, created_at
			FROM posts
			WHERE id = ?
			  AND group_id = ?
			  AND is_active = 1
		`,
			cursor,
			groupID,
		).Scan(&cursorID, &cursorCreatedAt)

		if err != nil {
			return nil, "", err
		}
	}

	rows, err := db.Query(`
		SELECT
			p.id,
			p.author_id,
			COALESCE(pr.nickname, ''),
			u.first_name,
			u.last_name,
			am.file_path,
			p.content,
			p.privacy,
			p.created_at,
			COALESCE((SELECT SUM(reaction_type = 'LIKE') FROM post_reactions WHERE post_id = p.id), 0),
			COALESCE((SELECT SUM(reaction_type = 'DISLIKE') FROM post_reactions WHERE post_id = p.id), 0),
			(SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_active = 1),
			(SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = ?)
		FROM posts p
		JOIN users u
			ON u.id = p.author_id
		LEFT JOIN profiles pr
			ON pr.user_id = p.author_id
		LEFT JOIN profile_avatars pa
			ON pa.user_id = p.author_id
		LEFT JOIN media am
			ON am.id = pa.media_id
		WHERE p.group_id = ?
		  AND p.is_active = 1
		  AND (
			? = ''
			OR p.created_at < ?
			OR (p.created_at = ? AND p.id < ?)
		  )
		ORDER BY p.created_at DESC, p.id DESC
		LIMIT ?
	`, viewerID, groupID, cursor, cursorCreatedAt, cursorCreatedAt, cursorID, limit+1)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	posts := make([]models.PostResponse, 0, limit)
	hasMore := false
	for rows.Next() {
		if len(posts) == limit {
			hasMore = true
			break
		}

		var post models.PostResponse
		if err := rows.Scan(&post.ID, &post.AuthorID, &post.AuthorNickname, &post.AuthorFirstName, &post.AuthorLastName,
			&post.AuthorAvatarPath, &post.Content, &post.Privacy, &post.CreatedAt, &post.LikeCount, &post.DislikeCount,
			&post.CommentCount, &post.ViewerReaction); err != nil {
			return nil, "", err
		}

		post.AuthorAvatarPath = helpers.PublicMediaPath(post.AuthorAvatarPath)

		posts = append(posts, post)
	}

	if err := rows.Err(); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if hasMore && len(posts) > 0 {
		nextCursor = posts[len(posts)-1].ID
	}

	return posts, nextCursor, nil
}
