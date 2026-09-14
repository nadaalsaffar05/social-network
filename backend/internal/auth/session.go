package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"social-network/internal/models"

	"github.com/gofrs/uuid/v5"
)

const (
	sessionCookieName = "session_token"
	sessionDuration   = 24 * time.Hour
)

func generateSessionToken() (string, error) {
	randomBytes := make([]byte, 32)

	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(randomBytes), nil
}

func hashSessionToken(token string) string {
	hash := sha256.Sum256([]byte(token))

	return hex.EncodeToString(hash[:])
}

func createSession(db *sql.DB, userID string) (string, error) {
	sessionID, err := uuid.NewV4()
	if err != nil {
		return "", err
	}

	token, err := generateSessionToken()
	if err != nil {
		return "", err
	}

	tokenHash := hashSessionToken(token)

	expiresAt := time.Now().UTC().Add(sessionDuration).Format(time.RFC3339)

	_, err = db.Exec(`
		INSERT INTO sessions (
			id,
			user_id,
			token_hash,
			expires_at
		)
		VALUES (?, ?, ?, ?)
	`,
		sessionID.String(),
		userID,
		tokenHash,
		expiresAt,
	)

	if err != nil {
		return "", err
	}

	return token, nil
}

func getUserFromSession(
	db *sql.DB,
	token string,
) (*models.User, error) {

	tokenHash := hashSessionToken(token)

	var userID string

	err := db.QueryRow(`
		SELECT user_id
		FROM sessions
		WHERE token_hash = ?
		  AND revoked_at IS NULL
		  AND datetime(expires_at) > datetime('now')
	`, tokenHash).Scan(&userID)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	if _, err := db.Exec(`
		UPDATE sessions
		SET last_seen_at =
			strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE token_hash = ?
	`, tokenHash); err != nil {
		return nil, err
	}

	return GetUserByID(db, userID)
}

func revokeSession(db *sql.DB, token string) error {
	tokenHash := hashSessionToken(token)

	_, err := db.Exec(`
		UPDATE sessions
		SET revoked_at =
			strftime('%Y-%m-%dT%H:%M:%fZ','now')
		WHERE token_hash = ?
		  AND revoked_at IS NULL
	`, tokenHash)

	return err
}

func setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(sessionDuration.Seconds()),
	})
}

func clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}
