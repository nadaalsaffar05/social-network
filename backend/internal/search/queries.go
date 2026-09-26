package search

import (
	"database/sql"
	"strings"

	"social-network/internal/helpers"
	"social-network/internal/models"
)

func searchUsers(db *sql.DB, currentUserID, query string, limit int) ([]models.SearchUserResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 15
	}
	pattern := "%" + strings.ToLower(query) + "%"
	rows, err := db.Query(`
		SELECT 
			u.id, 
			u.email, 
			u.first_name, 
			u.last_name, 
			pr.nickname, 
			am.file_path, 
			pr.privacy,
			EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) AS is_following,
			EXISTS(SELECT 1 FROM follow_requests WHERE sender_id = ? AND recipient_id = u.id AND status = 1000) AS is_requested
		FROM users u
		JOIN profiles pr ON pr.user_id = u.id
		LEFT JOIN profile_avatars pa ON pa.user_id = u.id
		LEFT JOIN media am ON am.id = pa.media_id
		WHERE (
			LOWER(u.first_name) LIKE ?
			OR LOWER(u.last_name) LIKE ?
			OR LOWER(COALESCE(pr.nickname, '')) LIKE ?
			OR LOWER(u.first_name || ' ' || u.last_name) LIKE ?
		)
		ORDER BY 
			CASE WHEN u.id = ? THEN 0 ELSE 1 END,
			u.first_name ASC,
			u.last_name ASC
		LIMIT ?
	`, currentUserID, currentUserID, pattern, pattern, pattern, pattern, currentUserID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.SearchUserResult, 0)
	for rows.Next() {
		var user models.SearchUserResult
		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.Nickname,
			&user.AvatarPath,
			&user.Privacy,
			&user.IsFollowing,
			&user.IsRequested,
		); err != nil {
			return nil, err
		}
		user.IsSelf = (user.ID == currentUserID)
		user.AvatarPath = helpers.PublicMediaPath(user.AvatarPath)
		users = append(users, user)
	}
	return users, rows.Err()
}

func searchGroups(db *sql.DB, currentUserID, query string, limit int) ([]models.SearchGroupResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 15
	}
	pattern := "%" + strings.ToLower(query) + "%"
	rows, err := db.Query(`
		SELECT 
			g.id,
			g.title,
			g.description,
			g.created_at,
			(SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 1000) AS member_count,
			EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = ? AND gm.status = 1000) AS is_member,
			EXISTS(SELECT 1 FROM group_join_requests gjr WHERE gjr.group_id = g.id AND gjr.user_id = ? AND gjr.status = 1000) AS is_pending
		FROM groups g
		WHERE (
			LOWER(g.title) LIKE ?
			OR LOWER(g.description) LIKE ?
		)
		ORDER BY 
			CASE WHEN LOWER(g.title) LIKE ? THEN 0 ELSE 1 END,
			g.created_at DESC
		LIMIT ?
	`, currentUserID, currentUserID, pattern, pattern, pattern, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := make([]models.SearchGroupResult, 0)
	for rows.Next() {
		var group models.SearchGroupResult
		if err := rows.Scan(
			&group.ID,
			&group.Title,
			&group.Description,
			&group.CreatedAt,
			&group.MemberCount,
			&group.IsMember,
			&group.IsPending,
		); err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func searchAllowedPosts(db *sql.DB, currentUserID, query string, limit int) ([]models.SearchPostResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 15
	}
	pattern := "%" + strings.ToLower(query) + "%"
	rows, err := db.Query(`
		SELECT 
			p.id, 
			p.author_id, 
			u.first_name, 
			u.last_name, 
			pr.nickname, 
			am.file_path, 
			pr.privacy,
			p.group_id,
			g.title,
			p.content, 
			p.privacy, 
			p.created_at,
			COALESCE((SELECT SUM(reaction_type = 'LIKE') FROM post_reactions WHERE post_id = p.id), 0),
			(SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_active = 1)
		FROM posts p
		JOIN users u ON u.id = p.author_id
		JOIN profiles pr ON pr.user_id = p.author_id
		LEFT JOIN groups g ON g.id = p.group_id
		LEFT JOIN profile_avatars pa ON pa.user_id = p.author_id
		LEFT JOIN media am ON am.id = pa.media_id
		WHERE p.is_active = 1
		  AND LOWER(p.content) LIKE ?
		  AND (
			(
				p.group_id IS NULL
				AND (
					p.author_id = ?
					OR pr.privacy = 1000
					OR EXISTS (
						SELECT 1 FROM follows account_follow
						WHERE account_follow.follower_id = ?
						  AND account_follow.following_id = p.author_id
					)
				)
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
			)
			OR (
				p.group_id IS NOT NULL
				AND p.privacy = 1030
				AND EXISTS (
					SELECT 1 FROM group_members gm
					WHERE gm.group_id = p.group_id
					  AND gm.user_id = ?
					  AND gm.status = 1000
				)
			)
		  )
		ORDER BY p.created_at DESC
		LIMIT ?
	`, pattern, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID, currentUserID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.SearchPostResult, 0)
	for rows.Next() {
		var post models.SearchPostResult
		if err := rows.Scan(
			&post.ID,
			&post.AuthorID,
			&post.AuthorFirstName,
			&post.AuthorLastName,
			&post.AuthorNickname,
			&post.AuthorAvatarPath,
			&post.AuthorPrivacy,
			&post.GroupID,
			&post.GroupTitle,
			&post.Content,
			&post.Privacy,
			&post.CreatedAt,
			&post.LikeCount,
			&post.CommentCount,
		); err != nil {
			return nil, err
		}
		post.AuthorAvatarPath = helpers.PublicMediaPath(post.AuthorAvatarPath)
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

func searchInvitableUsers(db *sql.DB, currentUserID, groupID, query string, limit int) ([]models.SearchUserResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 15
	}
	pattern := "%" + strings.ToLower(query) + "%"
	rows, err := db.Query(`
		SELECT
			u.id,
			u.email,
			u.first_name,
			u.last_name,
			pr.nickname,
			am.file_path,
			pr.privacy,
			EXISTS(
				SELECT 1
				FROM follows
				WHERE follower_id = ?
					AND following_id = u.id
			) AS is_following,
			EXISTS(
				SELECT 1
				FROM follow_requests
				WHERE sender_id = ?
					AND recipient_id = u.id
					AND status = 1000
			) AS is_requested
		FROM users u
		JOIN profiles pr
			ON pr.user_id = u.id
		LEFT JOIN profile_avatars pa
			ON pa.user_id = u.id
		LEFT JOIN media am
			ON am.id = pa.media_id
		WHERE u.id != ?
			AND (
				LOWER(u.first_name) LIKE ?
				OR LOWER(u.last_name) LIKE ?
				OR LOWER(COALESCE(pr.nickname, '')) LIKE ?
				OR LOWER(u.first_name || ' ' || u.last_name) LIKE ?
			)
			AND NOT EXISTS (
				SELECT 1
				FROM group_members gm
				WHERE gm.group_id = ?
					AND gm.user_id = u.id
					AND gm.status = 1000
			)
			AND NOT EXISTS (
				SELECT 1
				FROM group_join_requests gjr
				WHERE gjr.group_id = ?
					AND gjr.user_id = u.id
					AND gjr.status = 1000
			)
			AND NOT EXISTS (
				SELECT 1
				FROM group_invitations gi
				WHERE gi.group_id = ?
					AND gi.invited_user_id = u.id
					AND gi.status = 1000
			)
		ORDER BY
			u.first_name ASC,
			u.last_name ASC
		LIMIT ?
	`, currentUserID, currentUserID, currentUserID, pattern, pattern, pattern, pattern, groupID, groupID, groupID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.SearchUserResult, 0)
	for rows.Next() {
		var user models.SearchUserResult
		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&user.Nickname,
			&user.AvatarPath,
			&user.Privacy,
			&user.IsFollowing,
			&user.IsRequested,
		); err != nil {
			return nil, err
		}
		user.IsSelf = false
		user.AvatarPath = helpers.PublicMediaPath(user.AvatarPath)
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}
