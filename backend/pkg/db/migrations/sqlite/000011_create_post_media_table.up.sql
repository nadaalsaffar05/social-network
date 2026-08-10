CREATE TABLE post_media (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK(position >= 0),
  PRIMARY KEY(post_id, media_id), UNIQUE(post_id, position)
) WITHOUT ROWID;
CREATE INDEX idx_post_media_media ON post_media(media_id);
