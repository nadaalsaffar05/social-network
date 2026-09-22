package feed

import (
	"database/sql"
	"errors"
	"strings"

	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"
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

func deactivatePost(db *sql.DB, postID, authorID string) (bool, error) {
	result, err := db.Exec(`
		UPDATE posts
		SET is_active = 0
		WHERE id = ?
		  AND author_id = ?
		  AND is_active = 1
	`, postID, authorID)
	if err != nil {
		return false, err
	}

	updated, err := result.RowsAffected()
	return updated > 0, err
}

func deactivateComment(db *sql.DB, commentID, postID, authorID string) (bool, error) {
	result, err := db.Exec(`
		WITH RECURSIVE comment_thread(id) AS (
			SELECT id
			FROM comments
			WHERE id = ? AND post_id = ? AND author_id = ? AND is_active = 1
			UNION ALL
			SELECT child.id
			FROM comments child
			JOIN comment_thread parent ON child.parent_comment_id = parent.id
			WHERE child.post_id = ? AND child.is_active = 1
		)
		UPDATE comments
		SET is_active = 0
		WHERE id IN (SELECT id FROM comment_thread)
	`, commentID, postID, authorID, postID)
	if err != nil {
		return false, err
	}

	updated, err := result.RowsAffected()
	return updated > 0, err
}

func getFeedPosts(db *sql.DB, viewerID, cursorID, cursorCreatedAt string, limit int) (*sql.Rows, error) {
	return db.Query(`
        SELECT p.id, p.author_id, COALESCE(pr.nickname, ''), u.first_name, u.last_name, am.file_path, p.content, p.privacy, pr.privacy, p.created_at,
          COALESCE((SELECT SUM(reaction_type = 'LIKE') FROM post_reactions WHERE post_id = p.id), 0),
		  COALESCE((SELECT SUM(reaction_type = 'DISLIKE') FROM post_reactions WHERE post_id = p.id), 0),
		  (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_active = 1),
		  (SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = ?)
        FROM posts p
        JOIN users u ON u.id = p.author_id
        JOIN profiles pr ON pr.user_id = p.author_id
		LEFT JOIN profile_avatars pa ON pa.user_id = p.author_id
		LEFT JOIN media am ON am.id = pa.media_id
        WHERE p.is_active = 1
          AND (
			(
				p.group_id IS NULL
				AND (
					p.author_id = ?
					OR pr.privacy = ?
					OR EXISTS (
						SELECT 1 FROM follows account_follow
						WHERE account_follow.follower_id = ?
							AND account_follow.following_id = p.author_id
					)
				)
				AND (
					p.privacy = ?
					OR p.author_id = ?
					OR (
						p.privacy = ?
						AND EXISTS (
							SELECT 1 FROM follows f
							WHERE f.follower_id = ?
								AND f.following_id = p.author_id
						)
					)
					OR (
						p.privacy = ?
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
				AND p.privacy = ?
				AND EXISTS (
					SELECT 1 FROM group_members gm
					WHERE gm.group_id = p.group_id
						AND gm.user_id = ?
						AND gm.status = ?
				)
			)
          )
		  AND (
			? = ''
			OR p.created_at < ?
			OR (p.created_at = ? AND p.id < ?)
		  )
        ORDER BY p.created_at DESC, p.id DESC
		LIMIT ?
	`,
		viewerID,
		viewerID,
		enums.ProfilePrivacyPublic,
		viewerID,
		enums.PostPrivacyPublic,
		viewerID,
		enums.PostPrivacyFollowers,
		viewerID,
		enums.PostPrivacySelected,
		viewerID,
		enums.PostPrivacyGroup,
		viewerID,
		enums.GroupMembershipStatusActive,
		cursorID,
		cursorCreatedAt,
		cursorCreatedAt,
		cursorID,
		limit,
	)
}

func GetPostForViewer(db *sql.DB, postID, viewerID string) (models.PostResponse, bool, error) {
	allowed, err := canViewPost(db, postID, viewerID)
	if err != nil || !allowed {
		return models.PostResponse{}, allowed, err
	}

	var post models.PostResponse
	err = db.QueryRow(`
		SELECT p.id, p.author_id, COALESCE(pr.nickname, ''), u.first_name, u.last_name, am.file_path, p.content, p.privacy, pr.privacy, p.created_at,
			COALESCE((SELECT SUM(reaction_type = 'LIKE') FROM post_reactions WHERE post_id = p.id), 0),
			COALESCE((SELECT SUM(reaction_type = 'DISLIKE') FROM post_reactions WHERE post_id = p.id), 0),
			(SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_active = 1),
			(SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = ?)
		FROM posts p
		JOIN users u ON u.id = p.author_id
		JOIN profiles pr ON pr.user_id = p.author_id
		LEFT JOIN profile_avatars pa ON pa.user_id = p.author_id
		LEFT JOIN media am ON am.id = pa.media_id
		WHERE p.id = ?
		  AND p.is_active = 1
	`, viewerID, postID).Scan(
		&post.ID,
		&post.AuthorID,
		&post.AuthorNickname,
		&post.AuthorFirstName,
		&post.AuthorLastName,
		&post.AuthorAvatarPath,
		&post.Content,
		&post.Privacy,
		&post.AuthorPrivacy,
		&post.CreatedAt,
		&post.LikeCount,
		&post.DislikeCount,
		&post.CommentCount,
		&post.ViewerReaction,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return models.PostResponse{}, false, nil
	}
	if err != nil {
		return models.PostResponse{}, false, err
	}

	return post, true, nil
}

// GetProfilePostsForViewer returns posts written by profileUserID that the
// viewer is permitted to see. Group posts remain private to active members,
// even when the viewer is the post author.
func GetProfilePostsForViewer(db *sql.DB, profileUserID, viewerID string) ([]models.UserPost, error) {
	rows, err := db.Query(`
		SELECT
			p.id,
			p.author_id,
			p.content,
			p.privacy,
			p.created_at,
			p.updated_at,
			COALESCE((SELECT SUM(reaction_type = 'LIKE') FROM post_reactions WHERE post_id = p.id), 0),
			COALESCE((SELECT SUM(reaction_type = 'DISLIKE') FROM post_reactions WHERE post_id = p.id), 0),
			(SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_active = 1),
			(SELECT reaction_type FROM post_reactions WHERE post_id = p.id AND user_id = ?)
		FROM posts p
		JOIN profiles pr ON pr.user_id = p.author_id
		WHERE p.author_id = ?
			AND p.is_active = 1
			AND (
				(
					p.group_id IS NULL
					AND (
						p.author_id = ?
						OR pr.privacy = ?
						OR EXISTS (
							SELECT 1 FROM follows account_follow
							WHERE account_follow.follower_id = ?
								AND account_follow.following_id = p.author_id
						)
					)
					AND (
						p.author_id = ?
						OR p.privacy = ?
						OR (
							p.privacy = ?
							AND EXISTS (
								SELECT 1 FROM follows f
								WHERE f.follower_id = ?
									AND f.following_id = p.author_id
							)
						)
						OR (
							p.privacy = ?
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
					AND p.privacy = ?
					AND EXISTS (
						SELECT 1 FROM group_members gm
						WHERE gm.group_id = p.group_id
							AND gm.user_id = ?
							AND gm.status = ?
					)
				)
			)
		ORDER BY p.created_at DESC, p.id DESC
	`,
		viewerID,
		profileUserID,
		viewerID,
		enums.ProfilePrivacyPublic,
		viewerID,
		viewerID,
		enums.PostPrivacyPublic,
		enums.PostPrivacyFollowers,
		viewerID,
		enums.PostPrivacySelected,
		viewerID,
		enums.PostPrivacyGroup,
		viewerID,
		enums.GroupMembershipStatusActive,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	posts := make([]models.UserPost, 0)
	for rows.Next() {
		var post models.UserPost
		if err := rows.Scan(
			&post.ID,
			&post.AuthorID,
			&post.Content,
			&post.Privacy,
			&post.CreatedAt,
			&post.UpdatedAt,
			&post.LikeCount,
			&post.DislikeCount,
			&post.CommentCount,
			&post.ViewerReaction,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	postIDs := make([]string, len(posts))
	for index := range posts {
		postIDs[index] = posts[index].ID
	}
	mediaByPost, err := getPostMediaForPosts(db, postIDs)
	if err != nil {
		return nil, err
	}
	for index := range posts {
		posts[index].Media = mediaByPost[posts[index].ID]
	}

	return posts, nil
}

// canViewPost centralizes visibility rules for personal and group posts.
func canViewPost(db *sql.DB, postID, viewerID string) (bool, error) {
	var allowed int
	err := db.QueryRow(`
		SELECT CASE WHEN p.group_id IS NULL
			AND (
				p.author_id = ?
				OR pr.privacy = ?
				OR EXISTS (
					SELECT 1 FROM follows account_follow
					WHERE account_follow.follower_id = ? AND account_follow.following_id = p.author_id
				)
			)
			AND (
			p.privacy = ?
			OR p.author_id = ?
			OR (
				p.privacy = ?
				AND EXISTS (
					SELECT 1 FROM follows f
					WHERE f.follower_id = ? AND f.following_id = p.author_id
				)
			)
			OR (
				p.privacy = ?
				AND EXISTS (
					SELECT 1 FROM post_visibility pv
					WHERE pv.post_id = p.id AND pv.user_id = ?
				)
			)
		) THEN 1
		WHEN
			p.group_id IS NOT NULL
			AND EXISTS (
				SELECT 1
				FROM group_members gm
				WHERE gm.group_id = p.group_id
					AND gm.user_id = ?
					AND gm.status = ?
				)
		THEN 1 ELSE 0 END
		FROM posts p
		JOIN profiles pr ON pr.user_id = p.author_id
		WHERE p.id = ? AND p.is_active = 1
	`, viewerID, enums.ProfilePrivacyPublic, viewerID, enums.PostPrivacyPublic, viewerID, enums.PostPrivacyFollowers, viewerID, enums.PostPrivacySelected, viewerID, viewerID, enums.GroupMembershipStatusActive, postID).Scan(&allowed)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return allowed == 1, nil
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
		paths = append(paths, helpers.PublicMediaURL(path))
	}

	return paths, rows.Err()
}

func getPostMediaForPosts(db *sql.DB, postIDs []string) (map[string][]string, error) {
	mediaByPost := make(map[string][]string, len(postIDs))
	if len(postIDs) == 0 {
		return mediaByPost, nil
	}

	placeholders := strings.TrimRight(strings.Repeat("?,", len(postIDs)), ",")
	args := make([]any, len(postIDs))
	for i, postID := range postIDs {
		args[i] = postID
		mediaByPost[postID] = make([]string, 0)
	}

	rows, err := db.Query(`
		SELECT pm.post_id, m.file_path
		FROM post_media pm
		JOIN media m ON m.id = pm.media_id
		WHERE pm.post_id IN (`+placeholders+`)
		ORDER BY pm.post_id ASC, pm.position ASC
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var postID, path string
		if err := rows.Scan(&postID, &path); err != nil {
			return nil, err
		}
		mediaByPost[postID] = append(mediaByPost[postID], helpers.PublicMediaURL(path))
	}

	return mediaByPost, rows.Err()
}

// AttachPostMedia uses the shared post-media relationship for every post list,
// including group-post lists.
func AttachPostMedia(db *sql.DB, posts []models.PostResponse) error {
	postIDs := make([]string, len(posts))
	for index := range posts {
		postIDs[index] = posts[index].ID
	}

	mediaByPost, err := getPostMediaForPosts(db, postIDs)
	if err != nil {
		return err
	}

	for index := range posts {
		posts[index].Media = mediaByPost[posts[index].ID]
	}

	return nil
}

func isActiveGroupMember(db *sql.DB, groupID, userID string) (bool, error) {
	var active bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT 1
			FROM group_members
			WHERE group_id = ?
				AND user_id = ?
				AND status = ?
		)
	`, groupID, userID, enums.GroupMembershipStatusActive).Scan(&active)
	return active, err
}

func getActiveCommentAuthor(db *sql.DB, commentID, postID string) (string, bool, error) {
	var authorID string
	err := db.QueryRow(`
		SELECT author_id
		FROM comments
		WHERE id = ?
		  AND post_id = ?
		  AND is_active = 1
	`, commentID, postID).Scan(&authorID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}

	return authorID, true, nil
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

func getComments(db *sql.DB, postID, viewerID string) (*sql.Rows, error) {
	return db.Query(`
		SELECT
			c.id,
			c.post_id,
			c.author_id,
			COALESCE(pr.nickname, ''),
			u.first_name,
			u.last_name,
			am.file_path,
			c.parent_comment_id,
			c.content,
			c.created_at,
			COALESCE((SELECT SUM(reaction_type = 'LIKE') FROM comment_reactions WHERE comment_id = c.id), 0),
			COALESCE((SELECT SUM(reaction_type = 'DISLIKE') FROM comment_reactions WHERE comment_id = c.id), 0),
			(SELECT reaction_type FROM comment_reactions WHERE comment_id = c.id AND user_id = ?)
		FROM comments c
		JOIN users u ON u.id = c.author_id
		LEFT JOIN profiles pr ON pr.user_id = c.author_id
		LEFT JOIN profile_avatars pa ON pa.user_id = c.author_id
		LEFT JOIN media am ON am.id = pa.media_id
		WHERE c.post_id = ?
		  AND c.is_active = 1
		ORDER BY c.created_at ASC
	`, viewerID, postID)
}

func getCommentMediaForComments(db *sql.DB, commentIDs []string) (map[string][]string, error) {
	mediaByComment := make(map[string][]string, len(commentIDs))
	if len(commentIDs) == 0 {
		return mediaByComment, nil
	}

	placeholders := strings.TrimRight(strings.Repeat("?,", len(commentIDs)), ",")
	args := make([]any, len(commentIDs))
	for i, commentID := range commentIDs {
		args[i] = commentID
		mediaByComment[commentID] = make([]string, 0)
	}

	rows, err := db.Query(`
		SELECT cm.comment_id, m.file_path
		FROM comment_media cm
		JOIN media m ON m.id = cm.media_id
		WHERE cm.comment_id IN (`+placeholders+`)
		ORDER BY cm.comment_id ASC, cm.position ASC
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var commentID, path string
		if err := rows.Scan(&commentID, &path); err != nil {
			return nil, err
		}
		mediaByComment[commentID] = append(mediaByComment[commentID], "/"+path)
	}

	return mediaByComment, rows.Err()
}
func addCommentMedia(
	tx *sql.Tx,
	commentID string,
	mediaID string,
	uploaderID string,
	fileName string,
	filePath string,
	mimeType enums.MediaMIMEType,
	fileSize int64,
	position int,
) error {
	_, err := tx.Exec(`
		INSERT INTO media (
			id,
			uploader_id,
			file_name,
			file_path,
			mime_type,
			file_size
		)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		mediaID,
		uploaderID,
		fileName,
		filePath,
		string(mimeType),
		fileSize,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`
		INSERT INTO comment_media (
			comment_id,
			media_id,
			position
		)
		VALUES (?, ?, ?)
	`, commentID, mediaID, position)

	return err
}

func getPostReactionCounts(tx *sql.Tx, postID string) (int, int, error) {
	var likeCount int
	var dislikeCount int

	err := tx.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN reaction_type = 'LIKE' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN reaction_type = 'DISLIKE' THEN 1 ELSE 0 END), 0)
		FROM post_reactions
		WHERE post_id = ?
	`, postID).Scan(&likeCount, &dislikeCount)

	return likeCount, dislikeCount, err
}
func getCommentReactionCounts(tx *sql.Tx, commentID string) (int, int, error) {
	var likeCount int
	var dislikeCount int

	err := tx.QueryRow(`
		SELECT
			COALESCE(SUM(CASE WHEN reaction_type = 'LIKE' THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN reaction_type = 'DISLIKE' THEN 1 ELSE 0 END), 0)
		FROM comment_reactions
		WHERE comment_id = ?
	`, commentID).Scan(&likeCount, &dislikeCount)

	return likeCount, dislikeCount, err
}
