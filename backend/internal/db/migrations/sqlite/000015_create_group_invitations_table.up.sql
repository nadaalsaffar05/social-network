CREATE TABLE group_invitations (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  group_id TEXT NOT NULL,
  inviter_id TEXT NOT NULL,
  invited_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  responded_at TEXT,
  FOREIGN KEY(group_id, inviter_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE,
  CHECK(inviter_id <> invited_user_id),
  CHECK((status = 'PENDING' AND responded_at IS NULL) OR (status <> 'PENDING' AND responded_at IS NOT NULL))
);
CREATE UNIQUE INDEX uq_group_invitation_pending ON group_invitations(group_id, invited_user_id) WHERE status='PENDING';
CREATE INDEX idx_group_invitations_invited ON group_invitations(invited_user_id, status, created_at DESC);
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id, status, created_at DESC);
