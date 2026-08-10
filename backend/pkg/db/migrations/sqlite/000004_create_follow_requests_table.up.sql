CREATE TABLE follow_requests (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at TEXT,
  CHECK(sender_id <> recipient_id),
  CHECK((status = 'PENDING' AND responded_at IS NULL) OR (status <> 'PENDING' AND responded_at IS NOT NULL))
);
CREATE UNIQUE INDEX uq_follow_requests_pending ON follow_requests(sender_id, recipient_id) WHERE status = 'PENDING';
CREATE INDEX idx_follow_requests_recipient_status ON follow_requests(recipient_id, status, created_at DESC);
CREATE INDEX idx_follow_requests_sender_status ON follow_requests(sender_id, status, created_at DESC);
