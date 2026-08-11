CREATE TABLE conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_read_message_id INTEGER,
  PRIMARY KEY(conversation_id, user_id)
) WITHOUT ROWID;
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id, conversation_id);
