CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  privacy TEXT NOT NULL DEFAULT 'PUBLIC' CHECK(privacy IN ('PUBLIC','PRIVATE')),
  nickname TEXT COLLATE NOCASE UNIQUE CHECK(nickname IS NULL OR length(trim(nickname)) BETWEEN 3 AND 40),
  about_me TEXT CHECK(about_me IS NULL OR length(about_me) <= 2000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_profiles_privacy ON profiles(privacy);
