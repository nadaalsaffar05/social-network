package chat

import (
	"database/sql"
	"errors"
	"strings"

	"social-network/internal/models"

	"github.com/google/uuid"
)

var errUserNotFound = errors.New("user not found")

func createPrivateMessage(db *sql.DB, senderID, recipientID, content string) (models.PrivateMessage, error) {
	if senderID == recipientID {
		return models.PrivateMessage{}, errors.New("cannot message yourself")
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
			WHERE public_id = ? AND conversation_id = ? AND is_active = TRUE
		`, cursor, conversationID).Scan(&cursorCreatedAt, &cursorID)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, "", errors.New("invalid cursor")
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
			r.delivered_at,
			r.read_at
		FROM private_messages pm
		LEFT JOIN private_message_receipts r ON r.message_id = pm.id
		WHERE pm.conversation_id = ?
		  AND pm.is_active = TRUE
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

		message := models.PrivateMessage{RecipientID: otherUserID, IsActive: true}
		if err := rows.Scan(
			&message.PublicID,
			&message.ConversationID,
			&message.SenderID,
			&message.Content,
			&message.CreatedAt,
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

	nextCursor := ""
	if hasMore && len(messages) > 0 {
		nextCursor = messages[len(messages)-1].PublicID
	}

	return messages, nextCursor, nil
}

func getUserLastSeen(db *sql.DB, userID string) (*string, error) {
	var lastSeenAt *string
	err := db.QueryRow(`SELECT last_seen_at FROM user_presence WHERE user_id = ?`, userID).Scan(&lastSeenAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return lastSeenAt, err
}

func softDeletePrivateMessage(db *sql.DB, senderID, recipientID, publicMessageID string) (bool, error) {
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
		return false, err
	}

	updated, err := result.RowsAffected()
	return updated > 0, err
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

func validateMessageContent(content string) (string, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return "", errors.New("content is required")
	}
	if len([]rune(content)) > 10000 {
		return "", errors.New("content must be at most 10000 characters")
	}
	return content, nil
}
