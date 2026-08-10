CREATE TABLE comment_media (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK(position >= 0),
  PRIMARY KEY(comment_id, media_id), UNIQUE(comment_id, position)
) WITHOUT ROWID;
CREATE INDEX idx_comment_media_media ON comment_media(media_id);
