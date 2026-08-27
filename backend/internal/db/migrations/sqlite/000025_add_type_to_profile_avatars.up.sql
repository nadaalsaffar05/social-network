-- Add 'type' integer column to profile_avatars and make user_id nullable so that
-- generic system avatars (type = 1000) can exist in the pool without being assigned
-- to a specific user. User-uploaded avatars (type = 1010) always have a user_id.
--
-- Values: 1000 = Generic (system pool), 1010 = Custom (user-uploaded)
PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE profile_avatars_new (
  user_id    TEXT    UNIQUE REFERENCES profiles(user_id) ON DELETE CASCADE,
  media_id   TEXT    PRIMARY KEY NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
  type       INTEGER NOT NULL DEFAULT 1000 CHECK(type IN (1000, 1010)),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  -- Custom avatars must belong to a user; generic pool entries have no user.
  CHECK((type = 1010 AND user_id IS NOT NULL) OR (type = 1000))
);

INSERT INTO profile_avatars_new (user_id, media_id, type, created_at)
SELECT user_id, media_id, 1000, created_at FROM profile_avatars;

DROP TABLE profile_avatars;
ALTER TABLE profile_avatars_new RENAME TO profile_avatars;

PRAGMA foreign_keys = ON;
