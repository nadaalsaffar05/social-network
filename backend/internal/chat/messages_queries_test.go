package chat

import (
	"database/sql"
	"errors"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

func TestPrepareMessageRequestKeepsPendingConversationSingleSided(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	if _, err := db.Exec(`
		CREATE TABLE private_message_requests (
			conversation_id TEXT PRIMARY KEY,
			requester_id TEXT NOT NULL,
			recipient_id TEXT NOT NULL,
			status TEXT NOT NULL
		)
	`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
		INSERT INTO private_message_requests (conversation_id, requester_id, recipient_id, status)
		VALUES ('conversation-1', 'requester', 'recipient', 'PENDING')
	`); err != nil {
		t.Fatal(err)
	}

	tx, err := db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	created, err := prepareMessageRequest(
		tx,
		"conversation-1",
		"requester",
		"recipient",
		false,
	)
	if err != nil {
		t.Fatal(err)
	}
	if created {
		t.Fatal("continuing a pending request must not create another request")
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	var requestCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM private_message_requests`).Scan(&requestCount); err != nil {
		t.Fatal(err)
	}
	if requestCount != 1 {
		t.Fatalf("request count = %d, want 1", requestCount)
	}

	tx, err = db.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	_, err = prepareMessageRequest(
		tx,
		"conversation-1",
		"recipient",
		"requester",
		false,
	)
	if !errors.Is(err, errMessageRequestOpen) {
		t.Fatalf("recipient error = %v, want pending request error", err)
	}
}
