PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE notifications_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type INTEGER NOT NULL CHECK(type IN (1000, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1080, 1090)),
  follow_request_id TEXT REFERENCES follow_requests(id) ON DELETE CASCADE,
  group_invitation_id TEXT REFERENCES group_invitations(id) ON DELETE CASCADE,
  group_join_request_id TEXT REFERENCES group_join_requests(id) ON DELETE CASCADE,
  group_event_id TEXT REFERENCES group_events(id) ON DELETE CASCADE,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  read_at TEXT,
  CHECK((is_read = 0 AND read_at IS NULL) OR (is_read = 1 AND read_at IS NOT NULL))
);

INSERT INTO notifications_new
SELECT * FROM notifications;

DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;

CREATE INDEX idx_notifications_unread
  ON notifications(recipient_id, is_read, created_at DESC);

CREATE UNIQUE INDEX idx_notifications_birthday_daily
  ON notifications(recipient_id, actor_id, type, date(created_at))
  WHERE type = 1090;

PRAGMA foreign_keys = ON;
