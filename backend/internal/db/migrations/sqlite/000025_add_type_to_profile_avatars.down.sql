-- Reverse migration 25: restore the original profile_avatars schema
-- (user_id as PRIMARY KEY, no type column).
PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE profile_avatars_old (
  user_id    TEXT PRIMARY KEY NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  media_id   TEXT NOT NULL UNIQUE REFERENCES media(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Only migrate rows that have a user assigned (type=1010 rows or legacy 1000 rows with user_id).
INSERT INTO profile_avatars_old (user_id, media_id, created_at)
SELECT user_id, media_id, created_at
FROM profile_avatars
WHERE user_id IS NOT NULL;

DROP TABLE profile_avatars;
ALTER TABLE profile_avatars_old RENAME TO profile_avatars;

PRAGMA foreign_keys = ON;
