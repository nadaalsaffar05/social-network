package chat

import (
	"database/sql"
	"errors"
	"strings"

	"social-network/internal/models"

	"github.com/google/uuid"
)

var (
	errUserNotFound           = errors.New("user not found")
	errCannotMessageSelf      = errors.New("cannot message yourself")
	errInvalidCursor          = errors.New("invalid cursor")
	errMessageRequestOpen     = errors.New("message request is pending")
	errMessageRequestDeclined = errors.New("message request was declined")
)

func createPrivateMessage(db *sql.DB, senderID, recipientID, content string) (models.PrivateMessage, error) {
	if senderID == recipientID {
		return models.PrivateMessage{}, errCannotMessageSelf
	}

	tx, err := db.Begin()
	if err != nil {
		return models.PrivateMessage{}, err
	}
	defer tx.Rollback()

	if err := requireUser(tx, recipientID); err != nil {
		return models.PrivateMessage{}, err
	}

	conversationID, err := findOrCreateConversation(tx, senderID, recipientID)
	if err != nil {
		return models.PrivateMessage{}, err
	}

	isFriends, err := areFriends(tx, senderID, recipientID)
	if err != nil {
		return models.PrivateMessage{}, err
	}
	if err := prepareMessageRequest(tx, conversationID, senderID, recipientID, isFriends); err != nil {
		return models.PrivateMessage{}, err
	}

	message := models.PrivateMessage{
		PublicID:       uuid.NewString(),
		ConversationID: conversationID,
		SenderID:       senderID,
		RecipientID:    recipientID,
		Content:        content,
		IsActive:       true,
	}

	err = tx.QueryRow(`
		INSERT INTO private_messages (public_id, conversation_id, sender_id, content)
		VALUES (?, ?, ?, ?)
		RETURNING created_at
	`, message.PublicID, message.ConversationID, message.SenderID, message.Content).Scan(&message.CreatedAt)
	if err != nil {
		return models.PrivateMessage{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.PrivateMessage{}, err
	}

	return message, nil
}

func getPrivateMessages(db *sql.DB, userID, otherUserID, cursor string, limit int) ([]models.PrivateMessage, string, error) {
	if err := requireUser(db, otherUserID); err != nil {
		return nil, "", err
	}

	conversationID, found, err := findConversation(db, userID, otherUserID)
	if err != nil || !found {
		return []models.PrivateMessage{}, "", err
	}

	cursorCreatedAt := ""
	cursorID := int64(0)
	if cursor != "" {
		err := db.QueryRow(`
			SELECT created_at, id
			FROM private_messages
			WHERE public_id = ? AND conversation_id = ?
		`, cursor, conversationID).Scan(&cursorCreatedAt, &cursorID)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, "", errInvalidCursor
		}
		if err != nil {
			return nil, "", err
		}
	}

	rows, err := db.Query(`
		SELECT
			pm.public_id,
			pm.conversation_id,
			pm.sender_id,
			pm.content,
			pm.created_at,
			pm.is_active,
			r.delivered_at,
			r.read_at
		FROM private_messages pm
		LEFT JOIN private_message_receipts r ON r.message_id = pm.id
		WHERE pm.conversation_id = ?
		  AND (
			? = ''
			OR pm.created_at < ?
			OR (pm.created_at = ? AND pm.id < ?)
		  )
		ORDER BY pm.created_at DESC, pm.id DESC
		LIMIT ?
	`, conversationID, cursor, cursorCreatedAt, cursorCreatedAt, cursorID, limit+1)
	if err != nil {
		return nil, "", err
	}
	defer rows.Close()

	messages := make([]models.PrivateMessage, 0, limit)
	hasMore := false
	for rows.Next() {
		if len(messages) == limit {
			hasMore = true
			break
		}

		message := models.PrivateMessage{RecipientID: otherUserID}
		if err := rows.Scan(
			&message.PublicID,
			&message.ConversationID,
			&message.SenderID,
			&message.Content,
			&message.CreatedAt,
			&message.IsActive,
			&message.DeliveredAt,
			&message.ReadAt,
		); err != nil {
			return nil, "", err
		}
		if message.SenderID == otherUserID {
			message.RecipientID = userID
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, "", err
	}
	if err := attachMessageReactions(db, messages); err != nil {
		return nil, "", err
	}

	nextCursor := ""
	if hasMore && len(messages) > 0 {
		nextCursor = messages[len(messages)-1].PublicID
	}

	return messages, nextCursor, nil
}

func attachMessageReactions(db *sql.DB, messages []models.PrivateMessage) error {
	for index := range messages {
		rows, err := db.Query(`SELECT reaction.emoji, reaction.user_id FROM private_message_reactions reaction JOIN private_messages message ON message.id = reaction.message_id WHERE message.public_id = ? ORDER BY reaction.created_at`, messages[index].PublicID)
		if err != nil {
			return err
		}
		messages[index].Reactions = make([]models.MessageReaction, 0)
		for rows.Next() {
			var reaction models.MessageReaction
			if err := rows.Scan(&reaction.Emoji, &reaction.UserID); err != nil {
				rows.Close()
				return err
			}
			messages[index].Reactions = append(messages[index].Reactions, reaction)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return err
		}
		rows.Close()
	}
	return nil
}

func setMessageReaction(db *sql.DB, userID, otherUserID, publicID, emoji string) ([]models.MessageReaction, bool, error) {
	var err error
	emoji, err = ValidateReactionEmoji(emoji)
	if err != nil {
		return nil, false, err
	}
	conversationID, found, err := findConversation(db, userID, otherUserID)
	if err != nil || !found {
		return nil, false, err
	}
	var messageID int64
	if err := db.QueryRow(`SELECT id FROM private_messages WHERE public_id = ? AND conversation_id = ? AND is_active = TRUE`, publicID, conversationID).Scan(&messageID); errors.Is(err, sql.ErrNoRows) {
		return nil, false, nil
	} else if err != nil {
		return nil, false, err
	}
	var current string
	err = db.QueryRow(`SELECT emoji FROM private_message_reactions WHERE message_id = ? AND user_id = ?`, messageID, userID).Scan(&current)
	if err == nil && current == emoji {
		_, err = db.Exec(`DELETE FROM private_message_reactions WHERE message_id = ? AND user_id = ?`, messageID, userID)
	} else if errors.Is(err, sql.ErrNoRows) {
		_, err = db.Exec(`INSERT INTO private_message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)`, messageID, userID, emoji)
	} else if err == nil {
		_, err = db.Exec(`UPDATE private_message_reactions SET emoji = ?, created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE message_id = ? AND user_id = ?`, emoji, messageID, userID)
	}
	if err != nil {
		return nil, false, err
	}
	message := models.PrivateMessage{PublicID: publicID}
	if err := attachMessageReactions(db, []models.PrivateMessage{message}); err != nil {
		return nil, false, err
	}
	rows, err := db.Query(`SELECT emoji, user_id FROM private_message_reactions WHERE message_id = ? ORDER BY created_at`, messageID)
	if err != nil {
		return nil, false, err
	}
	defer rows.Close()
	reactions := make([]models.MessageReaction, 0)
	for rows.Next() {
		var reaction models.MessageReaction
		if err := rows.Scan(&reaction.Emoji, &reaction.UserID); err != nil {
			return nil, false, err
		}
		reactions = append(reactions, reaction)
	}
	return reactions, true, rows.Err()
}

// ValidateReactionEmoji is shared by private and group message reactions.
func ValidateReactionEmoji(emoji string) (string, error) {
	emoji = strings.TrimSpace(emoji)
	if emoji == "" || len([]rune(emoji)) > 32 {
		return "", errors.New("invalid emoji")
	}
	return emoji, nil
}

func getConversations(db *sql.DB, userID string) ([]models.ConversationSummary, error) {
	rows, err := db.Query(`
		SELECT
			conversation.id,
			other_user.id,
			other_user.first_name,
			other_user.last_name,
			other_profile.nickname,
			avatar_media.file_path,
			CASE WHEN last_message.is_active THEN last_message.content ELSE 'This message was deleted' END,
			last_message.created_at,
			COALESCE(request.status, 'ACCEPTED'),
			CASE WHEN request.status = 'PENDING' AND request.recipient_id = ? THEN 1 ELSE 0 END
		FROM private_conversations conversation
		JOIN conversation_participants current_participant
			ON current_participant.conversation_id = conversation.id
			AND current_participant.user_id = ?
		JOIN conversation_participants other_participant
			ON other_participant.conversation_id = conversation.id
			AND other_participant.user_id != ?
		JOIN users other_user ON other_user.id = other_participant.user_id
		JOIN profiles other_profile ON other_profile.user_id = other_user.id
		LEFT JOIN profile_avatars avatar ON avatar.user_id = other_user.id
		LEFT JOIN media avatar_media ON avatar_media.id = avatar.media_id
		JOIN private_messages last_message ON last_message.id = (
			SELECT message.id
			FROM private_messages message
			WHERE message.conversation_id = conversation.id
			ORDER BY message.created_at DESC, message.id DESC
			LIMIT 1
		)
		LEFT JOIN private_message_requests request ON request.conversation_id = conversation.id
		ORDER BY last_message.created_at DESC, last_message.id DESC
	`, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	conversations := make([]models.ConversationSummary, 0)
	for rows.Next() {
		var conversation models.ConversationSummary
		var incomingRequest int
		if err := rows.Scan(
			&conversation.ConversationID,
			&conversation.User.ID,
			&conversation.User.FirstName,
			&conversation.User.LastName,
			&conversation.User.Nickname,
			&conversation.User.AvatarPath,
			&conversation.LastMessage,
			&conversation.LastMessageAt,
			&conversation.RequestStatus,
			&incomingRequest,
		); err != nil {
			return nil, err
		}
		if conversation.User.AvatarPath != nil {
			path := "/" + strings.TrimLeft(*conversation.User.AvatarPath, "/")
			conversation.User.AvatarPath = &path
		}
		conversation.IsIncomingRequest = incomingRequest == 1
		conversations = append(conversations, conversation)
	}
	return conversations, rows.Err()
}

func getUserLastSeen(db *sql.DB, userID string) (*string, error) {
	var lastSeenAt *string
	err := db.QueryRow(`SELECT last_seen_at FROM user_presence WHERE user_id = ?`, userID).Scan(&lastSeenAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return lastSeenAt, err
}

func softDeletePrivateMessage(db *sql.DB, senderID, recipientID, publicMessageID string) (string, bool, error) {
	var actualRecipientID string
	err := db.QueryRow(`
		SELECT participant.user_id
		FROM private_messages message
		JOIN conversation_participants participant ON participant.conversation_id = message.conversation_id
		WHERE message.public_id = ?
		  AND message.sender_id = ?
		  AND message.is_active = TRUE
		  AND participant.user_id = ?
		  AND participant.user_id != ?
	`, publicMessageID, senderID, recipientID, senderID).Scan(&actualRecipientID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}

	result, err := db.Exec(`
		UPDATE private_messages
		SET is_active = FALSE
		WHERE public_id = ?
		  AND sender_id = ?
		  AND is_active = TRUE
		  AND EXISTS (
			SELECT 1
			FROM conversation_participants
			WHERE conversation_id = private_messages.conversation_id
			  AND user_id = ?
		  )
	`, publicMessageID, senderID, recipientID)
	if err != nil {
		return "", false, err
	}

	updated, err := result.RowsAffected()
	return actualRecipientID, updated > 0, err
}

func markMessageDelivered(db *sql.DB, recipientID, publicMessageID string) (string, bool, error) {
	messageID, senderID, found, err := getMessageForRecipient(db, recipientID, publicMessageID)
	if err != nil || !found {
		return "", false, err
	}

	result, err := db.Exec(`
		INSERT INTO private_message_receipts (message_id, delivered_at)
		VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		ON CONFLICT(message_id) DO NOTHING
	`, messageID)
	if err != nil {
		return "", false, err
	}
	updated, err := result.RowsAffected()
	return senderID, updated > 0, err
}

func markMessageRead(db *sql.DB, recipientID, publicMessageID string) (string, bool, error) {
	messageID, senderID, found, err := getMessageForRecipient(db, recipientID, publicMessageID)
	if err != nil || !found {
		return "", false, err
	}

	result, err := db.Exec(`
		INSERT INTO private_message_receipts (message_id, delivered_at, read_at)
		VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		ON CONFLICT(message_id) DO UPDATE SET
			delivered_at = COALESCE(private_message_receipts.delivered_at, excluded.delivered_at),
			read_at = COALESCE(private_message_receipts.read_at, excluded.read_at)
		WHERE private_message_receipts.read_at IS NULL
	`, messageID)
	if err != nil {
		return "", false, err
	}
	updated, err := result.RowsAffected()
	return senderID, updated > 0, err
}

func softDeletePrivateMessageByPublicID(db *sql.DB, senderID, publicMessageID string) (string, bool, error) {
	var recipientID string
	err := db.QueryRow(`
		SELECT participant.user_id
		FROM private_messages message
		JOIN conversation_participants participant ON participant.conversation_id = message.conversation_id
		WHERE message.public_id = ?
		  AND message.sender_id = ?
		  AND message.is_active = TRUE
		  AND participant.user_id != ?
		LIMIT 1
	`, publicMessageID, senderID, senderID).Scan(&recipientID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}

	result, err := db.Exec(`
		UPDATE private_messages
		SET is_active = FALSE
		WHERE public_id = ? AND sender_id = ? AND is_active = TRUE
	`, publicMessageID, senderID)
	if err != nil {
		return "", false, err
	}
	updated, err := result.RowsAffected()
	return recipientID, updated > 0, err
}

func getMessageForRecipient(db *sql.DB, recipientID, publicMessageID string) (int64, string, bool, error) {
	var messageID int64
	var senderID string
	err := db.QueryRow(`
		SELECT message.id, message.sender_id
		FROM private_messages message
		JOIN conversation_participants participant ON participant.conversation_id = message.conversation_id
		WHERE message.public_id = ?
		  AND message.sender_id != ?
		  AND message.is_active = TRUE
		  AND participant.user_id = ?
	`, publicMessageID, recipientID, recipientID).Scan(&messageID, &senderID)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, "", false, nil
	}
	if err != nil {
		return 0, "", false, err
	}
	return messageID, senderID, true, nil
}

func requireUser(queryer interface{ QueryRow(string, ...any) *sql.Row }, userID string) error {
	var exists int
	err := queryer.QueryRow(`SELECT 1 FROM users WHERE id = ?`, userID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return errUserNotFound
	}
	return err
}

func findOrCreateConversation(tx *sql.Tx, userID, otherUserID string) (string, error) {
	if conversationID, found, err := findConversation(tx, userID, otherUserID); err != nil || found {
		return conversationID, err
	}

	conversationID := uuid.NewString()
	if _, err := tx.Exec(`INSERT INTO private_conversations (id) VALUES (?)`, conversationID); err != nil {
		return "", err
	}
	if _, err := tx.Exec(`
		INSERT INTO conversation_participants (conversation_id, user_id)
		VALUES (?, ?), (?, ?)
	`, conversationID, userID, conversationID, otherUserID); err != nil {
		return "", err
	}
	return conversationID, nil
}

func findConversation(queryer interface{ QueryRow(string, ...any) *sql.Row }, userID, otherUserID string) (string, bool, error) {
	var conversationID string
	err := queryer.QueryRow(`
		SELECT c.id
		FROM private_conversations c
		JOIN conversation_participants first_participant
			ON first_participant.conversation_id = c.id AND first_participant.user_id = ?
		JOIN conversation_participants second_participant
			ON second_participant.conversation_id = c.id AND second_participant.user_id = ?
		WHERE (SELECT COUNT(*) FROM conversation_participants cp WHERE cp.conversation_id = c.id) = 2
		LIMIT 1
	`, userID, otherUserID).Scan(&conversationID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return conversationID, true, nil
}

func areFriends(queryer interface{ QueryRow(string, ...any) *sql.Row }, userID, otherUserID string) (bool, error) {
	var followsBothWays int
	err := queryer.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM follows first_follow
			JOIN follows second_follow
				ON second_follow.follower_id = first_follow.following_id
				AND second_follow.following_id = first_follow.follower_id
			WHERE first_follow.follower_id = ? AND first_follow.following_id = ?
		)
	`, userID, otherUserID).Scan(&followsBothWays)
	return followsBothWays == 1, err
}

func prepareMessageRequest(tx *sql.Tx, conversationID, senderID, recipientID string, isFriends bool) error {
	var status string
	err := tx.QueryRow(`SELECT status FROM private_message_requests WHERE conversation_id = ?`, conversationID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		if isFriends {
			return nil
		}
		_, err = tx.Exec(`
			INSERT INTO private_message_requests (conversation_id, requester_id, recipient_id)
			VALUES (?, ?, ?)
		`, conversationID, senderID, recipientID)
		return err
	}
	if err != nil {
		return err
	}
	if status == "ACCEPTED" {
		return nil
	}
	if isFriends {
		_, err = tx.Exec(`
			UPDATE private_message_requests
			SET status = 'ACCEPTED', responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			WHERE conversation_id = ? AND status = 'PENDING'
		`, conversationID)
		return err
	}
	if status == "DECLINED" {
		return errMessageRequestDeclined
	}
	return errMessageRequestOpen
}

func respondToMessageRequest(db *sql.DB, recipientID, requesterID, status string) (models.MessageRequestResponse, bool, error) {
	var request models.MessageRequestResponse
	err := db.QueryRow(`
		SELECT conversation_id, requester_id, recipient_id, status, created_at
		FROM private_message_requests
		WHERE requester_id = ? AND recipient_id = ? AND status = 'PENDING'
	`, requesterID, recipientID).Scan(
		&request.ConversationID,
		&request.RequesterID,
		&request.RecipientID,
		&request.Status,
		&request.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return models.MessageRequestResponse{}, false, nil
	}
	if err != nil {
		return models.MessageRequestResponse{}, false, err
	}

	result, err := db.Exec(`
		UPDATE private_message_requests
		SET status = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		WHERE conversation_id = ? AND status = 'PENDING'
	`, status, request.ConversationID)
	if err != nil {
		return models.MessageRequestResponse{}, false, err
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return models.MessageRequestResponse{}, false, err
	}
	if updated == 0 {
		return models.MessageRequestResponse{}, false, nil
	}
	request.Status = status
	return request, true, nil
}

func getMessageRequests(db *sql.DB, recipientID string) ([]models.MessageRequestResponse, error) {
	rows, err := db.Query(`
		SELECT
			request.conversation_id,
			request.requester_id,
			request.recipient_id,
			request.status,
			request.created_at,
			requester.id,
			requester.first_name,
			requester.last_name,
			requester_profile.nickname,
			requester_avatar_media.file_path,
			message.public_id,
			message.sender_id,
			message.content,
			message.created_at,
			receipt.delivered_at,
			receipt.read_at
		FROM private_message_requests request
		JOIN users requester ON requester.id = request.requester_id
		JOIN profiles requester_profile ON requester_profile.user_id = requester.id
		LEFT JOIN profile_avatars requester_avatar ON requester_avatar.user_id = requester.id
		LEFT JOIN media requester_avatar_media ON requester_avatar_media.id = requester_avatar.media_id
		JOIN private_messages message ON message.id = (
			SELECT first_message.id
			FROM private_messages first_message
			WHERE first_message.conversation_id = request.conversation_id
			  AND first_message.is_active = TRUE
			ORDER BY first_message.created_at ASC, first_message.id ASC
			LIMIT 1
		)
		LEFT JOIN private_message_receipts receipt ON receipt.message_id = message.id
		WHERE request.recipient_id = ? AND request.status = 'PENDING'
		ORDER BY request.created_at DESC
	`, recipientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]models.MessageRequestResponse, 0)
	for rows.Next() {
		var request models.MessageRequestResponse
		requester := models.ChatUser{}
		message := models.PrivateMessage{RecipientID: recipientID, IsActive: true}
		if err := rows.Scan(
			&request.ConversationID,
			&request.RequesterID,
			&request.RecipientID,
			&request.Status,
			&request.CreatedAt,
			&requester.ID,
			&requester.FirstName,
			&requester.LastName,
			&requester.Nickname,
			&requester.AvatarPath,
			&message.PublicID,
			&message.SenderID,
			&message.Content,
			&message.CreatedAt,
			&message.DeliveredAt,
			&message.ReadAt,
		); err != nil {
			return nil, err
		}
		if requester.AvatarPath != nil {
			path := "/" + strings.TrimLeft(*requester.AvatarPath, "/")
			requester.AvatarPath = &path
		}
		message.ConversationID = request.ConversationID
		request.Message = &message
		request.Requester = &requester
		requests = append(requests, request)
	}
	return requests, rows.Err()
}

func isPendingMessageRequest(db *sql.DB, conversationID string) (bool, error) {
	var pending int
	err := db.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM private_message_requests
			WHERE conversation_id = ? AND status = 'PENDING'
		)
	`, conversationID).Scan(&pending)
	return pending == 1, err
}

func ValidateMessageContent(content string) (string, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return "", errors.New("content is required")
	}
	if len([]rune(content)) > 10000 {
		return "", errors.New("content must be at most 10000 characters")
	}
	return content, nil
}
