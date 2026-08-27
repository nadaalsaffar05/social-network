PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE posts_old (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE, content TEXT NOT NULL DEFAULT '' CHECK(length(content) <= 10000),
  privacy INTEGER NOT NULL CHECK(privacy IN (1000, 1010, 1020)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE CHECK(is_active IN (FALSE, TRUE)),
  CHECK((group_id IS NULL AND privacy IN (1000, 1010, 1020)) OR (group_id IS NOT NULL AND privacy = 1020))
);
INSERT INTO posts_old SELECT id, author_id, group_id, content, CASE WHEN group_id IS NOT NULL THEN 1020 ELSE privacy END, created_at, updated_at, is_active FROM posts;
DROP TABLE posts;
ALTER TABLE posts_old RENAME TO posts;
CREATE INDEX idx_posts_author_feed ON posts(author_id, created_at DESC) WHERE is_active = 1;
CREATE INDEX idx_posts_group_feed ON posts(group_id, created_at DESC) WHERE is_active = 1;
CREATE INDEX idx_posts_public_feed ON posts(privacy, created_at DESC) WHERE is_active = 1;

CREATE TABLE notifications_old (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL, type INTEGER NOT NULL CHECK(type IN (1000, 1010, 1020, 1030)),
  follow_request_id TEXT REFERENCES follow_requests(id) ON DELETE CASCADE, group_invitation_id TEXT REFERENCES group_invitations(id) ON DELETE CASCADE,
  group_join_request_id TEXT REFERENCES group_join_requests(id) ON DELETE CASCADE, group_event_id TEXT REFERENCES group_events(id) ON DELETE CASCADE,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE, comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), read_at TEXT,
  CHECK((is_read = 0 AND read_at IS NULL) OR (is_read = 1 AND read_at IS NOT NULL))
);
-- This intentionally fails if an extended notification exists, rather than
-- silently deleting notification data during a downgrade to migration 000026.
INSERT INTO notifications_old SELECT * FROM notifications;
DROP TABLE notifications;
ALTER TABLE notifications_old RENAME TO notifications;
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read, created_at DESC);

PRAGMA foreign_keys = ON;
