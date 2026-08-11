CREATE TABLE group_events (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  group_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
  description TEXT NOT NULL DEFAULT '' CHECK(length(description) <= 5000),
  starts_at TEXT NOT NULL CHECK(datetime(starts_at) IS NOT NULL),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(id, group_id),
  FOREIGN KEY(group_id, creator_id) REFERENCES group_members(group_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX idx_group_events_group_starts ON group_events(group_id, starts_at);
