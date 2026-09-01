CREATE TABLE private_message_receipts (
  message_id INTEGER PRIMARY KEY REFERENCES private_messages(id) ON DELETE CASCADE,
  delivered_at TEXT,
  read_at TEXT
);

CREATE TABLE user_presence (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TEXT
);

CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen_at);
