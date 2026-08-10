CREATE TABLE private_messages (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE CHECK(length(public_id) = 36),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 10000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  edited_at TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE CHECK(is_active IN (FALSE, TRUE)),
  FOREIGN KEY(conversation_id, sender_id) REFERENCES conversation_participants(conversation_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX idx_private_messages_conversation_created ON private_messages(conversation_id, created_at, id);
