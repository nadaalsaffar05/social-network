FROM golang:1.24-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev

ENV GOTOOLCHAIN=auto

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./

RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd


FROM alpine:3.21 AS backend

RUN apk add --no-cache ca-certificates sqlite-libs tzdata

WORKDIR /app

COPY --from=backend-builder /app/server /app/server

COPY backend/internal/db/migrations /app/internal/db/migrations

COPY backend/run.sh /app/run.sh
RUN chmod +x /app/run.sh


RUN mkdir -p /app/internal/db /app/uploads /app/tmp

ENV PORT=8080 \
    DB_PATH=/app/internal/db/social-network.db \
    MIGRATIONS_PATH=file:///app/internal/db/migrations/sqlite

EXPOSE 8080

ENTRYPOINT ["/app/server"]


FROM node:20-alpine AS frontend

WORKDIR /app/Frontend


COPY Frontend/package*.json ./
RUN npm ci


COPY Frontend/ ./

RUN npm run build

EXPOSE 5173


CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
