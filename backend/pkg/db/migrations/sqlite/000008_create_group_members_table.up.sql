CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('CREATOR','MEMBER')),
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(group_id, user_id)
) WITHOUT ROWID;
CREATE INDEX idx_group_members_user ON group_members(user_id, group_id);
CREATE TRIGGER groups_add_creator_membership AFTER INSERT ON groups BEGIN
  INSERT INTO group_members(group_id, user_id, role) VALUES (NEW.id, NEW.creator_id, 'CREATOR');
END;
