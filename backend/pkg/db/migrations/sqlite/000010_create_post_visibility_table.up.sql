CREATE TABLE post_visibility (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(post_id, user_id)
) WITHOUT ROWID;
CREATE INDEX idx_post_visibility_user ON post_visibility(user_id, post_id);
