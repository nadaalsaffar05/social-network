CREATE TABLE event_attendees (
  event_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  response TEXT NOT NULL CHECK(response IN ('GOING','NOT_GOING')),
  responded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(event_id, user_id),
  FOREIGN KEY(event_id, group_id) REFERENCES group_events(id, group_id) ON DELETE CASCADE,
  FOREIGN KEY(group_id, user_id) REFERENCES group_members(group_id, user_id) ON DELETE CASCADE
) WITHOUT ROWID;
CREATE INDEX idx_event_attendees_user ON event_attendees(user_id, event_id);
