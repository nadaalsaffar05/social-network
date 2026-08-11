CREATE TABLE comments (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '' CHECK(length(content) <= 5000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE CHECK(is_active IN (FALSE, TRUE)),
  CHECK(parent_comment_id IS NULL OR parent_comment_id <> id)
);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at) WHERE is_active = 1;
CREATE INDEX idx_comments_author_created ON comments(author_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id, created_at);
