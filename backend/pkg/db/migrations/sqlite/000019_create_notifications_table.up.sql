CREATE TABLE notifications (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('FOLLOW_REQUEST','FOLLOW_ACCEPTED','GROUP_INVITATION','GROUP_JOIN_REQUEST','GROUP_EVENT_CREATED','POST_REACTION','COMMENT_REACTION','COMMENT','NEW_FOLLOWER')),
  follow_request_id TEXT REFERENCES follow_requests(id) ON DELETE CASCADE,
  group_invitation_id TEXT REFERENCES group_invitations(id) ON DELETE CASCADE,
  group_join_request_id TEXT REFERENCES group_join_requests(id) ON DELETE CASCADE,
  group_event_id TEXT REFERENCES group_events(id) ON DELETE CASCADE,
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  read_at TEXT,
  CHECK((is_read = 0 AND read_at IS NULL) OR (is_read = 1 AND read_at IS NOT NULL))
);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read, created_at DESC);
