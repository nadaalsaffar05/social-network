CREATE TABLE media (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL CHECK(length(trim(file_name)) BETWEEN 1 AND 255),
  file_path TEXT NOT NULL UNIQUE CHECK(length(trim(file_path)) BETWEEN 1 AND 2048),
  mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/gif')),
  file_size INTEGER NOT NULL CHECK(file_size > 0 AND file_size <= 52428800),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_media_uploader_created ON media(uploader_id, created_at DESC);
CREATE TABLE profile_avatars (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  media_id TEXT NOT NULL UNIQUE REFERENCES media(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
