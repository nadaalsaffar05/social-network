package groups

import (
	"database/sql"
	"errors"
	"strings"

	"social-network/internal/chat"
	"social-network/internal/enums"
	"social-network/internal/models"
)

type groupChatUserScanner interface {
	Scan(...any) error
}

func scanGroupChatUser(scanner groupChatUserScanner) (models.ChatUser, error) {
	var user models.ChatUser
	if err := scanner.Scan(
		&user.ID,
		&user.FirstName,
		&user.LastName,
		&user.Nickname,
		&user.AvatarPath,
	); err != nil {
		return models.ChatUser{}, err
	}
	if user.AvatarPath != nil {
		path := "/" + strings.TrimLeft(*user.AvatarPath, "/")
		user.AvatarPath = &path
	}
	return user, nil
}

func summarizeGroupMessageReactions(reactions []models.MessageReaction, viewerID string) []models.GroupMessageReaction {
	summary := make([]models.GroupMessageReaction, 0)
	indexes := make(map[string]int)

	for _, reaction := range reactions {
		index, found := indexes[reaction.Emoji]
		if !found {
			index = len(summary)
			indexes[reaction.Emoji] = index
			summary = append(summary, models.GroupMessageReaction{
				Emoji:          reaction.Emoji,
				ReactedUserIDs: []string{},
			})
		}

		item := &summary[index]
		item.Count++
		item.ReactedUserIDs = append(item.ReactedUserIDs, reaction.UserID)
		item.ViewerReacted = item.ViewerReacted || reaction.UserID == viewerID
	}

	return summary
}

func newGroupMessageReactionEvent(groupID, publicID, viewerID string, reactions []models.MessageReaction) models.GroupMessageReactionEvent {
	return models.GroupMessageReactionEvent{
		GroupID:         groupID,
		PublicID:        publicID,
		Reactions:       reactions,
		ReactionSummary: summarizeGroupMessageReactions(reactions, viewerID),
	}
}

func attachGroupMessageMetadata(db *sql.DB, messages []models.GroupMessage, viewerID string) error {
	if len(messages) == 0 {
		return nil
	}

	messageIndexes := make(map[string]int, len(messages))
	messageIDs := make([]string, len(messages))
	for index := range messages {
		messages[index].ReadBy = []models.ChatUser{}
		messages[index].Reactions = []models.MessageReaction{}
		messages[index].ReactionSummary = []models.GroupMessageReaction{}
		messageIndexes[messages[index].PublicID] = index
		messageIDs[index] = messages[index].PublicID
	}

	placeholders := strings.TrimRight(strings.Repeat("?,", len(messageIDs)), ",")
	readerArgs := make([]any, 0, len(messageIDs)+1)
	readerArgs = append(readerArgs, enums.GroupMembershipStatusActive)
	for _, messageID := range messageIDs {
		readerArgs = append(readerArgs, messageID)
	}

	readerRows, err := db.Query(`
		SELECT
			message.public_id,
			user.id,
			user.first_name,
			user.last_name,
			profile.nickname,
			avatar_media.file_path
		FROM group_message_receipts receipt
		JOIN group_messages message ON message.id = receipt.message_id
		JOIN group_members membership
			ON membership.group_id = message.group_id
			AND membership.user_id = receipt.user_id
			AND membership.status = ?
		JOIN users user ON user.id = receipt.user_id
		LEFT JOIN profiles profile ON profile.user_id = user.id
		LEFT JOIN profile_avatars avatar ON avatar.user_id = user.id
		LEFT JOIN media avatar_media ON avatar_media.id = avatar.media_id
		WHERE message.public_id IN (`+placeholders+`)
			AND receipt.user_id != message.sender_id
		ORDER BY receipt.read_at ASC, receipt.user_id ASC
	`, readerArgs...)
	if err != nil {
		return err
	}
	defer readerRows.Close()

	for readerRows.Next() {
		var publicID string
		var reader models.ChatUser
		if err := readerRows.Scan(&publicID, &reader.ID, &reader.FirstName, &reader.LastName, &reader.Nickname, &reader.AvatarPath); err != nil {
			return err
		}
		if reader.AvatarPath != nil {
			path := "/" + strings.TrimLeft(*reader.AvatarPath, "/")
			reader.AvatarPath = &path
		}
		if index, found := messageIndexes[publicID]; found {
			messages[index].ReadBy = append(messages[index].ReadBy, reader)
			messages[index].ReadCount = len(messages[index].ReadBy)
		}
	}
	if err := readerRows.Err(); err != nil {
		return err
	}

	reactionArgs := make([]any, 0, len(messageIDs))
	for _, messageID := range messageIDs {
		reactionArgs = append(reactionArgs, messageID)
	}
	reactionRows, err := db.Query(`
		SELECT message.public_id, reaction.emoji, reaction.user_id
		FROM group_message_reactions reaction
		JOIN group_messages message ON message.id = reaction.message_id
		JOIN group_members membership
			ON membership.group_id = message.group_id
			AND membership.user_id = reaction.user_id
			AND membership.status = ?
		WHERE message.public_id IN (`+placeholders+`)
		ORDER BY reaction.created_at ASC, reaction.user_id ASC
	`, append([]any{enums.GroupMembershipStatusActive}, reactionArgs...)...)
	if err != nil {
		return err
	}
	defer reactionRows.Close()

	for reactionRows.Next() {
		var publicID, emoji, userID string
		if err := reactionRows.Scan(&publicID, &emoji, &userID); err != nil {
			return err
		}
		messageIndex, found := messageIndexes[publicID]
		if !found {
			continue
		}
		messages[messageIndex].Reactions = append(messages[messageIndex].Reactions, models.MessageReaction{
			Emoji:  emoji,
			UserID: userID,
		})
	}
	if err := reactionRows.Err(); err != nil {
		return err
	}
	for index := range messages {
		messages[index].ReactionSummary = summarizeGroupMessageReactions(messages[index].Reactions, viewerID)
	}

	return nil
}

func groupMessageReadEvent(db *sql.DB, groupID, publicID string) (models.GroupMessageReadEvent, error) {
	var messageID int64
	err := db.QueryRow(`
		SELECT id
		FROM group_messages
		WHERE group_id = ? AND public_id = ? AND is_active = TRUE
	`, groupID, publicID).Scan(&messageID)
	if err != nil {
		return models.GroupMessageReadEvent{}, err
	}

	readBy, err := getGroupMessageReaders(db, messageID)
	if err != nil {
		return models.GroupMessageReadEvent{}, err
	}
	return models.GroupMessageReadEvent{
		GroupID:   groupID,
		PublicID:  publicID,
		ReadCount: len(readBy),
		ReadBy:    readBy,
	}, nil
}

func getGroupMessageReaders(db *sql.DB, messageID int64) ([]models.ChatUser, error) {
	rows, err := db.Query(`
		SELECT
			user.id,
			user.first_name,
			user.last_name,
			profile.nickname,
			avatar_media.file_path
		FROM group_message_receipts receipt
		JOIN group_messages message ON message.id = receipt.message_id
		JOIN group_members membership
			ON membership.group_id = message.group_id
			AND membership.user_id = receipt.user_id
			AND membership.status = ?
		JOIN users user ON user.id = receipt.user_id
		LEFT JOIN profiles profile ON profile.user_id = user.id
		LEFT JOIN profile_avatars avatar ON avatar.user_id = user.id
		LEFT JOIN media avatar_media ON avatar_media.id = avatar.media_id
		WHERE receipt.message_id = ?
			AND receipt.user_id != message.sender_id
		ORDER BY receipt.read_at ASC, receipt.user_id ASC
	`, enums.GroupMembershipStatusActive, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	readBy := make([]models.ChatUser, 0)
	for rows.Next() {
		reader, err := scanGroupChatUser(rows)
		if err != nil {
			return nil, err
		}
		readBy = append(readBy, reader)
	}
	return readBy, rows.Err()
}

func markGroupMessageRead(db *sql.DB, groupID, userID, publicID string) (models.GroupMessageReadEvent, bool, error) {
	result, err := db.Exec(`
		INSERT INTO group_message_receipts (message_id, user_id)
		SELECT message.id, ?
		FROM group_messages message
		WHERE message.group_id = ?
			AND message.public_id = ?
			AND message.is_active = TRUE
			AND message.sender_id != ?
			AND EXISTS (
				SELECT 1
				FROM group_members membership
				WHERE membership.group_id = message.group_id
					AND membership.user_id = ?
					AND membership.status = ?
			)
		ON CONFLICT(message_id, user_id) DO NOTHING
	`, userID, groupID, publicID, userID, userID, enums.GroupMembershipStatusActive)
	if err != nil {
		return models.GroupMessageReadEvent{}, false, err
	}
	updated, err := result.RowsAffected()
	if err != nil || updated == 0 {
		return models.GroupMessageReadEvent{}, false, err
	}

	event, err := groupMessageReadEvent(db, groupID, publicID)
	return event, err == nil, err
}

func setGroupMessageReaction(db *sql.DB, groupID, userID, publicID, emoji string) (bool, error) {
	validatedEmoji, err := chat.ValidateReactionEmoji(emoji)
	if err != nil {
		return false, err
	}

	var messageID int64
	err = db.QueryRow(`
		SELECT message.id
		FROM group_messages message
		WHERE message.group_id = ?
			AND message.public_id = ?
			AND message.is_active = TRUE
			AND EXISTS (
				SELECT 1
				FROM group_members membership
				WHERE membership.group_id = message.group_id
					AND membership.user_id = ?
					AND membership.status = ?
			)
	`, groupID, publicID, userID, enums.GroupMembershipStatusActive).Scan(&messageID)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	var currentEmoji string
	err = db.QueryRow(`
		SELECT emoji
		FROM group_message_reactions
		WHERE message_id = ? AND user_id = ?
	`, messageID, userID).Scan(&currentEmoji)
	switch {
	case err == nil && currentEmoji == validatedEmoji:
		_, err = db.Exec(`
			DELETE FROM group_message_reactions
			WHERE message_id = ? AND user_id = ?
		`, messageID, userID)
	case errors.Is(err, sql.ErrNoRows):
		_, err = db.Exec(`
			INSERT INTO group_message_reactions (message_id, user_id, emoji)
			VALUES (?, ?, ?)
		`, messageID, userID, validatedEmoji)
	case err == nil:
		_, err = db.Exec(`
			UPDATE group_message_reactions
			SET emoji = ?, created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE message_id = ? AND user_id = ?
		`, validatedEmoji, messageID, userID)
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

func getGroupMessageReactions(db *sql.DB, groupID, publicID string) ([]models.MessageReaction, error) {
	var messageID int64
	err := db.QueryRow(`
		SELECT id
		FROM group_messages
		WHERE group_id = ? AND public_id = ? AND is_active = TRUE
	`, groupID, publicID).Scan(&messageID)
	if err != nil {
		return nil, err
	}

	rows, err := db.Query(`
		SELECT reaction.emoji, reaction.user_id
		FROM group_message_reactions reaction
		JOIN group_members membership
			ON membership.group_id = ?
			AND membership.user_id = reaction.user_id
			AND membership.status = ?
		WHERE reaction.message_id = ?
		ORDER BY reaction.created_at ASC, reaction.user_id ASC
	`, groupID, enums.GroupMembershipStatusActive, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reactions := make([]models.MessageReaction, 0)
	for rows.Next() {
		var emoji, userID string
		if err := rows.Scan(&emoji, &userID); err != nil {
			return nil, err
		}
		reactions = append(reactions, models.MessageReaction{Emoji: emoji, UserID: userID})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return reactions, nil
}

func getActiveGroupChatUsers(db *sql.DB, groupID string, userIDs []string) ([]models.ChatUser, error) {
	if len(userIDs) == 0 {
		return []models.ChatUser{}, nil
	}

	placeholders := strings.TrimRight(strings.Repeat("?,", len(userIDs)), ",")
	args := make([]any, 0, len(userIDs)+2)
	args = append(args, groupID, enums.GroupMembershipStatusActive)
	for _, userID := range userIDs {
		args = append(args, userID)
	}

	rows, err := db.Query(`
		SELECT
			u.id,
			u.first_name,
			u.last_name,
			profile.nickname,
			avatar_media.file_path
		FROM group_members membership
		JOIN users u ON u.id = membership.user_id
		LEFT JOIN profiles profile ON profile.user_id = u.id
		LEFT JOIN profile_avatars avatar ON avatar.user_id = u.id
		LEFT JOIN media avatar_media ON avatar_media.id = avatar.media_id
		WHERE membership.group_id = ?
			AND membership.status = ?
			AND membership.user_id IN (`+placeholders+`)
	`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := make(map[string]models.ChatUser, len(userIDs))
	for rows.Next() {
		user, err := scanGroupChatUser(rows)
		if err != nil {
			return nil, err
		}
		byID[user.ID] = user
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	users := make([]models.ChatUser, 0, len(byID))
	for _, userID := range userIDs {
		if user, found := byID[userID]; found {
			users = append(users, user)
		}
	}
	return users, nil
}
