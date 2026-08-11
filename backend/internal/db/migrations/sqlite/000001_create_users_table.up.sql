PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(email)) BETWEEN 3 AND 254),
    password_hash TEXT NOT NULL CHECK(length(password_hash) >= 20),
    first_name TEXT NOT NULL CHECK(length(trim(first_name)) BETWEEN 1 AND 100),
    last_name TEXT NOT NULL CHECK(length(trim(last_name)) BETWEEN 1 AND 100),
    date_of_birth TEXT NOT NULL CHECK(date(date_of_birth) IS NOT NULL),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
