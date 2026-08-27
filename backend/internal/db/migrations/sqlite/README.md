# SQLite database migrations

This directory contains the versioned SQLite schema for the Social Network backend. The project uses [golang-migrate](https://github.com/golang-migrate/migrate) to apply these files in numeric order and to track the version applied to each local database.

The local development database used in the examples below is `backend/internal/db/social-network.db`. Do not commit this file: it is created locally from the migrations. The SQL migration files are the database changes that must be committed and shared with the team.

## Prerequisites

Install the `migrate` CLI with SQLite support, then make sure its installation directory is on your `PATH`:

```sh
go install -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
migrate -version
```

Run all commands from the repository root. The database directory must exist before SQLite can create the database file.

## Migration files

Each migration has a numeric version and two files:

```text
000001_create_users_table.up.sql
000001_create_users_table.down.sql
```

- `*.up.sql` applies one logical database change.
- `*.down.sql` reverses that same change.
- Versions run in ascending numeric order for `up` and descending order for `down`.
- Always commit the matching `up` and `down` files together.

Current schema migrations:

| Versions | Tables/features |
| --- | --- |
| `000001`–`000003` | users, profiles, sessions |
| `000004`–`000005` | follow requests and accepted follows |
| `000006` | uploaded image metadata and profile avatars |
| `000007`–`000008` | groups and group membership |
| `000009`–`000014` | posts, restricted viewers, post/comment media, comments, and reactions |
| `000015`–`000018` | group invitations, join requests, events, and attendance responses |
| `000019` | in-app notifications |
| `000020`–`000023` | private conversations/messages and group chat/messages |

## Everyday commands

Set these values once per terminal session if you want shorter commands:

```sh
MIGRATIONS=backend/internal/db/migrations/sqlite
DATABASE='sqlite3://backend/internal/db/social-network.db'
```

The commands below use the full paths, so they also work without those variables.

### Apply all pending migrations

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" up
```

This applies every migration that has not yet been applied. Run it after cloning the project and after pulling new migration files from Git.

### Check the current migration version

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" version
```

The command reports the version recorded in the database. If it reports `dirty`, a previous migration stopped partway through and must be investigated before continuing.

### Apply one migration

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" up 1
```

### Roll back one migration

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" down 1
```

This runs the `.down.sql` file for the latest applied migration.

### Roll back all migrations

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" down -all
```

This removes all schema changes by running down migrations in reverse order. It is destructive and deletes the data in those tables. `down` without `-all` rolls back only one migration, so `-all` is required here.

### Move to an exact version

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" goto 23
```

`goto` migrates up or down until the requested version is reached. Use it only with a known safe target version.

## Creating a migration

Generate a sequential pair of files instead of copying the complete schema into a new migration:

```sh
migrate create -ext sql -dir backend/internal/db/migrations/sqlite -seq create_example_table
```

This creates files similar to:

```text
000024_create_example_table.up.sql
000024_create_example_table.down.sql
```

The up file contains the change to apply; the down file contains the SQL needed to reverse it.

Example:

```sql
-- 000024_create_example_table.up.sql
CREATE TABLE example_table (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
```

```sql
-- 000024_create_example_table.down.sql
DROP TABLE example_table;
```

## Adding a database change

1. Create a new numbered migration with `migrate create`.
2. Put only that logical change in the `.up.sql` file.
3. Add the exact reversal in the matching `.down.sql` file.
4. Test the migration locally by applying it and rolling it back.
5. Apply it again so the local database returns to the latest version.
6. Commit both SQL files to Git. Do not commit `social-network.db`.

For example, after creating `000024_create_example_table`, test it with:

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" up 1
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" down 1
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" up 1
```

## Recovering from a dirty migration

Do not immediately use `force`: first inspect and fix the failing SQL or database state. Once the schema is known to match a version, mark that version explicitly:

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" force 23
```

`force` only changes golang-migrate's recorded version; it does not run SQL. Use it only after confirming the real schema is at that version.

## Team workflow

When pulling migrations added by another teammate, update the local database with:

```sh
migrate -path backend/internal/db/migrations/sqlite -database "sqlite3://backend/internal/db/social-network.db" up
```

Never rename, edit, reorder, or delete a migration that has already been shared. Add a new migration to correct it instead. This keeps every teammate's database history consistent.
