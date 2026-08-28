-- Downgrading removes DISLIKE reactions because migration 000027 only permits
-- the legacy emoji domain and there is no semantically correct conversion.
PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

CREATE TABLE post_reactions_old (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('LIKE','LOVE','HAHA','WOW','SAD','ANGRY')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(post_id, user_id)
) WITHOUT ROWID;
INSERT INTO post_reactions_old SELECT post_id, user_id, reaction_type, created_at, updated_at FROM post_reactions WHERE reaction_type = 'LIKE';
DROP TABLE post_reactions;
ALTER TABLE post_reactions_old RENAME TO post_reactions;
CREATE INDEX idx_post_reactions_user ON post_reactions(user_id, post_id);

CREATE TABLE comment_reactions_old (
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('LIKE','LOVE','HAHA','WOW','SAD','ANGRY')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(comment_id, user_id)
) WITHOUT ROWID;
INSERT INTO comment_reactions_old SELECT comment_id, user_id, reaction_type, created_at, updated_at FROM comment_reactions WHERE reaction_type = 'LIKE';
DROP TABLE comment_reactions;
ALTER TABLE comment_reactions_old RENAME TO comment_reactions;
CREATE INDEX idx_comment_reactions_user ON comment_reactions(user_id, comment_id);

PRAGMA foreign_keys = ON;
