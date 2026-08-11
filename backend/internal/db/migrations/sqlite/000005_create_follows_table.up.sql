CREATE TABLE follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(follower_id, following_id),
  CHECK(follower_id <> following_id)
) WITHOUT ROWID;
CREATE INDEX idx_follows_following ON follows(following_id, created_at DESC);
