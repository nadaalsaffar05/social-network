# Loop

Loop is a social networking application for sharing posts, connecting with people, joining groups, and messaging in real time.

## Features

- User profiles, follow requests, and privacy controls
- Posts, comments, reactions, and image or GIF uploads
- Groups, memberships, invitations, and events
- Private and group messaging with realtime updates
- Notifications and user search

## Technology

- **Frontend:** React and Vite
- **Backend:** Go, HTTP APIs, and WebSockets
- **Database:** SQLite with versioned migrations
- **Deployment:** Docker and Docker Compose

## Project structure

```text
backend/
  cmd/                         Server startup, database setup, and routes
  internal/
    auth/                      Registration, login, sessions, and middleware
    chat/                      Private chat and realtime messaging
    db/migrations/sqlite/      SQLite schema migrations
    feed/                      Posts, comments, media, and reactions
    groups/                    Groups, events, memberships, and group chat
    jobs/                      Scheduled notification and session tasks
    models/                    API and database data types
    notifications/             Notification handlers and queries
    profile/                   Profiles and follow operations
    search/                    Search handlers and queries
    helpers/                    Shared backend helpers

Frontend/
  src/
    api/                       HTTP API clients
    app/                       Application setup and routes
    features/                  Feature pages, components, and hooks
    shared/                    Shared components, styles, hooks, and utilities
```

## Run locally

Start the backend:

```sh
cd backend
go run ./cmd
```

Start the frontend in another terminal:

```sh
cd Frontend
npm ci
npm run dev
```

The backend defaults to port 8080 and the Vite development server to port 5173. The backend applies pending SQLite migrations on startup.

## Docker

From the repository root, run:

```sh
docker compose up --build
```
