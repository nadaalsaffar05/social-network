-- Posts and comments have a simple like/dislike interaction. Emoji reactions
-- belong to private and group messages, which use separate tables.
-- Legacy emoji reactions on posts/comments have no equivalent meaning and are
-- intentionally removed.
PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE post_reactions_new (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('LIKE','DISLIKE')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(post_id, user_id)
) WITHOUT ROWID;
INSERT INTO post_reactions_new
SELECT post_id, user_id, reaction_type, created_at, updated_at
FROM post_reactions
WHERE reaction_type = 'LIKE';
DROP TABLE post_reactions;
ALTER TABLE post_reactions_new RENAME TO post_reactions;
CREATE INDEX idx_post_reactions_user ON post_reactions(user_id, post_id);

CREATE TABLE comment_reactions_new (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('LIKE','DISLIKE')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(comment_id, user_id)
) WITHOUT ROWID;
INSERT INTO comment_reactions_new
SELECT comment_id, user_id, reaction_type, created_at, updated_at
FROM comment_reactions
WHERE reaction_type = 'LIKE';
DROP TABLE comment_reactions;
ALTER TABLE comment_reactions_new RENAME TO comment_reactions;
CREATE INDEX idx_comment_reactions_user ON comment_reactions(user_id, comment_id);

PRAGMA foreign_keys = ON;
