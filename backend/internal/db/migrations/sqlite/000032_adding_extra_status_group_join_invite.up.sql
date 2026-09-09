PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE group_invitations_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), group_id TEXT NOT NULL, inviter_id TEXT NOT NULL,
  invited_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status INTEGER NOT NULL DEFAULT 1000 CHECK(status IN (1000, 1010, 1020, 1030)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), responded_at TEXT,
  FOREIGN KEY(group_id, inviter_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE,
  CHECK(inviter_id <> invited_user_id), CHECK((status = 1000 AND responded_at IS NULL) OR (status <> 1000 AND responded_at IS NOT NULL))
);
INSERT INTO group_invitations_new SELECT id, group_id, inviter_id, invited_user_id,
 status, created_at, responded_at FROM group_invitations;
DROP TABLE group_invitations;
ALTER TABLE group_invitations_new RENAME TO group_invitations;
CREATE UNIQUE INDEX uq_group_invitation_pending ON group_invitations(group_id, invited_user_id) WHERE status = 1000;
CREATE INDEX idx_group_invitations_invited ON group_invitations(invited_user_id, status, created_at DESC);
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id, status, created_at DESC);

CREATE TABLE group_join_requests_new (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36), group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status INTEGER NOT NULL DEFAULT 1000 CHECK(status IN (1000, 1010, 1020, 1030)), created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), responded_at TEXT,
  UNIQUE(id, group_id), CHECK((status = 1000 AND responded_at IS NULL) OR (status <> 1000 AND responded_at IS NOT NULL))
);
INSERT INTO group_join_requests_new SELECT id, group_id, user_id,
 status, created_at, responded_at FROM group_join_requests;
DROP TABLE group_join_requests;
ALTER TABLE group_join_requests_new RENAME TO group_join_requests;
CREATE UNIQUE INDEX uq_group_join_request_pending ON group_join_requests(group_id, user_id) WHERE status = 1000;
CREATE INDEX idx_group_join_requests_group ON group_join_requests(group_id, status, created_at DESC);
CREATE INDEX idx_group_join_requests_user ON group_join_requests(user_id, status, created_at DESC);

PRAGMA foreign_keys = ON;