# =========================================
# Stage 1: Build Go Backend
# =========================================
FROM golang:1.24-alpine AS backend-builder

# Install build dependencies for CGO (SQLite3)
RUN apk add --no-cache gcc musl-dev

# Enable automatic Go toolchain management
ENV GOTOOLCHAIN=auto

WORKDIR /app/backend

# Copy dependency definition files first for layer caching
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ ./

# Build CGO-enabled binary targeting backend/cmd
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd

# =========================================
# Stage 2: Backend Runtime Image
# =========================================
FROM alpine:3.21 AS backend

RUN apk add --no-cache ca-certificates sqlite-libs tzdata

WORKDIR /app

# Copy compiled backend binary from builder
COPY --from=backend-builder /app/server /app/server

# Copy database migrations (required for auto-migrations at startup)
COPY backend/internal/db/migrations /app/internal/db/migrations

# Copy entrypoint script
COPY backend/run.sh /app/run.sh
RUN chmod +x /app/run.sh

# Create persistent directories for SQLite database and uploaded files
RUN mkdir -p /app/internal/db /app/uploads /app/tmp

ENV PORT=8080 \
    DB_PATH=/app/internal/db/social-network.db \
    MIGRATIONS_PATH=file:///app/internal/db/migrations/sqlite

EXPOSE 8080

ENTRYPOINT ["/app/server"]

# =========================================
# Stage 3: Build & Run React Frontend (Node/Vite)
# =========================================
FROM node:20-alpine AS frontend

WORKDIR /app/Frontend

# Copy dependency files and install
COPY Frontend/package*.json ./
RUN npm ci

# Copy full Frontend source code
COPY Frontend/ ./

# Build production bundle
RUN npm run build

EXPOSE 5173

# Serve built frontend bundle via Vite preview bound to 0.0.0.0
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
