# Loop Social Network

Loop is a full-stack social networking application. The React client talks to a Go HTTP API backed by SQLite. The backend also provides private and group messaging over WebSockets, scheduled notifications, and file-backed media uploads.

## Features

- User registration, login, profile editing, avatar uploads, and follow requests
- Public and privacy-filtered posts, comments, reactions, and media
- Groups with membership requests, invitations, events, and posts
- Private messaging, message requests, group chat, presence, and reactions
- Notifications, global search, and in-app realtime updates

## Repository layout

- `backend/cmd` starts the HTTP server and wires routes and database setup.
- `backend/internal` contains API handlers, SQL queries, models, helpers, realtime chat, and scheduled jobs.
- `backend/internal/db/migrations/sqlite` contains versioned SQLite migrations.
- `Frontend/src` contains the React app, feature pages, API clients, shared components, and utilities.

## Run locally

### Requirements

- Go 1.25 or newer
- Node.js 20 or newer and npm
- A C compiler for the SQLite Go driver when building the backend locally

Start the backend in one terminal:

```sh
cd backend
go run ./cmd
```

The server listens on port 8080 by default. On startup it creates/opens `backend/internal/db/social-network.db` and applies pending migrations from `backend/internal/db/migrations/sqlite`. Override `PORT`, `DB_PATH`, or `MIGRATIONS_PATH` to use different values.

Start the frontend in another terminal:

```sh
cd Frontend
npm ci
npm run dev
```

Vite serves the client at http://localhost:5173. The API base URL is configured in `Frontend/src/config/environment.js` and defaults to http://localhost:8080.

## Run with Docker Compose

From the repository root:

```sh
docker compose up --build
```

The frontend is available at http://localhost:5173 and the backend at http://localhost:8080. Compose stores the SQLite database, uploads, and temporary media in named volumes. Stop the services with `docker compose down`; add `-v` only when you also intend to remove those volumes and their data.

## Useful commands

Run backend tests:

```sh
cd backend
go test ./...
```

Lint and build the frontend:

```sh
cd Frontend
npm run lint
npm run build
```

## Database migrations

Migration files are numbered pairs of `.up.sql` and `.down.sql` files. The server applies all pending migrations automatically at startup. See [the migration guide](backend/internal/db/migrations/sqlite/README.md) for manual migration commands and workflow. Do not edit migrations that have already been shared; add a new migration to change an existing schema.

## Media and runtime data

Uploaded media is written under the backend's `uploads` and `tmp` directories and served by the backend. Keep runtime databases and uploaded files out of source control. Docker Compose uses persistent named volumes for this data.
