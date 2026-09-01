CREATE TABLE private_message_requests (
  conversation_id TEXT PRIMARY KEY REFERENCES private_conversations(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  responded_at TEXT,
  CHECK(requester_id <> recipient_id)
);

CREATE INDEX idx_private_message_requests_recipient_status
  ON private_message_requests(recipient_id, status, created_at DESC);
