CREATE TABLE posts (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '' CHECK(length(content) <= 10000),
  privacy TEXT NOT NULL CHECK(privacy IN ('PUBLIC','FOLLOWERS','PRIVATE','GROUP')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE CHECK(is_active IN (FALSE, TRUE)),
  CHECK((group_id IS NULL AND privacy IN ('PUBLIC','FOLLOWERS','PRIVATE')) OR (group_id IS NOT NULL AND privacy = 'GROUP'))
);
CREATE INDEX idx_posts_author_feed ON posts(author_id, created_at DESC) WHERE is_active = 1;
CREATE INDEX idx_posts_group_feed ON posts(group_id, created_at DESC) WHERE is_active = 1;
CREATE INDEX idx_posts_public_feed ON posts(privacy, created_at DESC) WHERE is_active = 1;
