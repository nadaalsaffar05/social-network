CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash) >= 32),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL CHECK(datetime(expires_at) > datetime(created_at)),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at TEXT CHECK(revoked_at IS NULL OR datetime(revoked_at) >= datetime(created_at))
);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, revoked_at, expires_at);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
