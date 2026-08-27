-- SQLite rebuilds a table to change a column's type or CHECK constraint.
-- Existing legacy values are translated into their closest supported enum.
PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE follow_requests_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status INTEGER NOT NULL DEFAULT 1000 CHECK(status IN (1000, 1010, 1020)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at TEXT,
  CHECK(sender_id <> recipient_id),
  CHECK((status = 1000 AND responded_at IS NULL) OR (status <> 1000 AND responded_at IS NOT NULL))
);
INSERT INTO follow_requests_new SELECT id, sender_id, recipient_id,
  CASE status WHEN 'PENDING' THEN 1000 WHEN 'ACCEPTED' THEN 1010 ELSE 1020 END,
  created_at, responded_at FROM follow_requests;
DROP TABLE follow_requests;
ALTER TABLE follow_requests_new RENAME TO follow_requests;
CREATE UNIQUE INDEX uq_follow_requests_pending ON follow_requests(sender_id, recipient_id) WHERE status = 1000;
CREATE INDEX idx_follow_requests_recipient_status ON follow_requests(recipient_id, status, created_at DESC);
CREATE INDEX idx_follow_requests_sender_status ON follow_requests(sender_id, status, created_at DESC);

CREATE TABLE group_invitations_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), group_id TEXT NOT NULL, inviter_id TEXT NOT NULL,
  invited_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status INTEGER NOT NULL DEFAULT 1000 CHECK(status IN (1000, 1010, 1020)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), responded_at TEXT,
  FOREIGN KEY(group_id, inviter_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE,
  CHECK(inviter_id <> invited_user_id), CHECK((status = 1000 AND responded_at IS NULL) OR (status <> 1000 AND responded_at IS NOT NULL))
);
INSERT INTO group_invitations_new SELECT id, group_id, inviter_id, invited_user_id,
  CASE status WHEN 'PENDING' THEN 1000 WHEN 'ACCEPTED' THEN 1010 ELSE 1020 END, created_at, responded_at FROM group_invitations;
DROP TABLE group_invitations;
ALTER TABLE group_invitations_new RENAME TO group_invitations;
CREATE UNIQUE INDEX uq_group_invitation_pending ON group_invitations(group_id, invited_user_id) WHERE status = 1000;
CREATE INDEX idx_group_invitations_invited ON group_invitations(invited_user_id, status, created_at DESC);
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id, status, created_at DESC);

CREATE TABLE group_join_requests_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status INTEGER NOT NULL DEFAULT 1000 CHECK(status IN (1000, 1010, 1020)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), responded_at TEXT,
  UNIQUE(id, group_id), CHECK((status = 1000 AND responded_at IS NULL) OR (status <> 1000 AND responded_at IS NOT NULL))
);
INSERT INTO group_join_requests_new SELECT id, group_id, user_id,
  CASE status WHEN 'PENDING' THEN 1000 WHEN 'ACCEPTED' THEN 1010 ELSE 1020 END, created_at, responded_at FROM group_join_requests;
DROP TABLE group_join_requests;
ALTER TABLE group_join_requests_new RENAME TO group_join_requests;
CREATE UNIQUE INDEX uq_group_join_request_pending ON group_join_requests(group_id, user_id) WHERE status = 1000;
CREATE INDEX idx_group_join_requests_group ON group_join_requests(group_id, status, created_at DESC);
CREATE INDEX idx_group_join_requests_user ON group_join_requests(user_id, status, created_at DESC);

ALTER TABLE group_members ADD COLUMN status INTEGER NOT NULL DEFAULT 1000 CHECK(status IN (1000, 1010));

CREATE TABLE profiles_new (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  privacy INTEGER NOT NULL DEFAULT 1000 CHECK(privacy IN (1000, 1010)),
  nickname TEXT COLLATE NOCASE UNIQUE CHECK(nickname IS NULL OR length(trim(nickname)) BETWEEN 3 AND 40),
  about_me TEXT CHECK(about_me IS NULL OR length(about_me) <= 2000), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO profiles_new SELECT user_id, CASE privacy WHEN 'PRIVATE' THEN 1010 ELSE 1000 END, nickname, about_me, created_at, updated_at FROM profiles;
DROP TABLE profiles;
ALTER TABLE profiles_new RENAME TO profiles;
CREATE INDEX idx_profiles_privacy ON profiles(privacy);

CREATE TABLE posts_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  group_id TEXT REFERENCES groups(id) ON DELETE CASCADE, content TEXT NOT NULL DEFAULT '' CHECK(length(content) <= 10000),
  privacy INTEGER NOT NULL CHECK(privacy IN (1000, 1010, 1020, 1030)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE CHECK(is_active IN (FALSE, TRUE)),
  CHECK((group_id IS NULL AND privacy IN (1000, 1010, 1020)) OR (group_id IS NOT NULL AND privacy = 1030))
);
INSERT INTO posts_new SELECT id, author_id, group_id, content,
  CASE privacy WHEN 'PUBLIC' THEN 1000 WHEN 'FOLLOWERS' THEN 1010 WHEN 'PRIVATE' THEN 1020 ELSE 1030 END, created_at, updated_at, is_active FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;
CREATE INDEX idx_posts_author_feed ON posts(author_id, created_at DESC) WHERE is_active = 1;
CREATE INDEX idx_posts_group_feed ON posts(group_id, created_at DESC) WHERE is_active = 1;
CREATE INDEX idx_posts_public_feed ON posts(privacy, created_at DESC) WHERE is_active = 1;

CREATE TABLE event_attendees_new (
  event_id TEXT NOT NULL, group_id TEXT NOT NULL, user_id TEXT NOT NULL,
  response INTEGER NOT NULL CHECK(response IN (1000, 1010)), responded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(event_id, user_id), FOREIGN KEY(event_id, group_id) REFERENCES group_events(id, group_id) ON DELETE CASCADE,
  FOREIGN KEY(group_id, user_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE
) WITHOUT ROWID;
INSERT INTO event_attendees_new SELECT event_id, group_id, user_id, CASE response WHEN 'GOING' THEN 1000 ELSE 1010 END, responded_at FROM event_attendees;
DROP TABLE event_attendees;
ALTER TABLE event_attendees_new RENAME TO event_attendees;
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id, event_id);

CREATE TABLE notifications_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL, type INTEGER NOT NULL CHECK(type IN (1000, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1080)),
  follow_request_id TEXT REFERENCES follow_requests(id) ON DELETE CASCADE,
  group_invitation_id TEXT REFERENCES group_invitations(id) ON DELETE CASCADE,
  group_join_request_id TEXT REFERENCES group_join_requests(id) ON DELETE CASCADE,
  group_event_id TEXT REFERENCES group_events(id) ON DELETE CASCADE, post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE, is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), read_at TEXT, CHECK((is_read = 0 AND read_at IS NULL) OR (is_read = 1 AND read_at IS NOT NULL))
);
INSERT INTO notifications_new SELECT id, recipient_id, actor_id,
  CASE type
    WHEN 'FOLLOW_REQUEST' THEN 1000
    WHEN 'GROUP_INVITATION' THEN 1010
    WHEN 'GROUP_JOIN_REQUEST' THEN 1020
    WHEN 'GROUP_EVENT_CREATED' THEN 1030
    WHEN 'FOLLOW_ACCEPTED' THEN 1040
    WHEN 'POST_REACTION' THEN 1050
    WHEN 'COMMENT_REACTION' THEN 1060
    WHEN 'COMMENT' THEN 1070
    WHEN 'NEW_FOLLOWER' THEN 1080
  END,
  follow_request_id, group_invitation_id, group_join_request_id, group_event_id, post_id, comment_id, is_read, created_at, read_at FROM notifications;
DROP TABLE notifications;
ALTER TABLE notifications_new RENAME TO notifications;
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read, created_at DESC);

PRAGMA foreign_keys = ON;
