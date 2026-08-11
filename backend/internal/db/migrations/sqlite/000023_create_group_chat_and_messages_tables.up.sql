CREATE TABLE group_chats (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
  group_id TEXT NOT NULL UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(id, group_id)
);
CREATE TRIGGER groups_create_chat AFTER INSERT ON groups BEGIN
  INSERT INTO group_chats(id, group_id) VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), NEW.id);
END;
CREATE TABLE group_messages (
  id INTEGER PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE CHECK(length(public_id) = 36),
  chat_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK(length(content) BETWEEN 1 AND 10000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  edited_at TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE CHECK(is_active IN (FALSE, TRUE)),
  FOREIGN KEY(chat_id, group_id) REFERENCES group_chats(id, group_id) ON DELETE CASCADE,
  FOREIGN KEY(group_id, sender_id) REFERENCES group_members(group_id, user_id) ON DELETE RESTRICT
);
CREATE INDEX idx_group_messages_group_created ON group_messages(group_id, created_at, id);
