CREATE TABLE group_join_requests (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at TEXT,
  UNIQUE(id, group_id),
  CHECK((status = 'PENDING' AND responded_at IS NULL) OR (status <> 'PENDING' AND responded_at IS NOT NULL))
);
CREATE UNIQUE INDEX uq_group_join_request_pending ON group_join_requests(group_id, user_id) WHERE status='PENDING';
CREATE INDEX idx_group_join_requests_group ON group_join_requests(group_id, status, created_at DESC);
CREATE INDEX idx_group_join_requests_user ON group_join_requests(user_id, status, created_at DESC);
