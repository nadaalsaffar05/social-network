CREATE TABLE private_message_reactions (
  message_id INTEGER NOT NULL REFERENCES private_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK(length(emoji) BETWEEN 1 AND 32),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_private_message_reactions_message ON private_message_reactions(message_id);
