package auth

import (
	"database/sql"
	"errors"
	"math/rand"

	"social-network/internal/models"

	"github.com/gofrs/uuid/v5"
)

const userQuery = `
	SELECT
		u.id,
		u.email,
		u.password_hash,
		u.first_name,
		u.last_name,
		u.date_of_birth,
		p.nickname,
		p.about_me,
		p.privacy
	FROM users u
	JOIN profiles p ON p.user_id = u.id
`

func getUserByEmail(db *sql.DB, email string) (*models.User, error) {
	return getUser(db, userQuery+"WHERE u.email = ?", email)
}

func GetUserByID(db *sql.DB, userID string) (*models.User, error) {
	return getUser(db, userQuery+"WHERE u.id = ?", userID)
}

func getUser(db *sql.DB, query, value string) (*models.User, error) {
	user := &models.User{}

	err := db.QueryRow(query, value).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.DateOfBirth,
		&user.Nickname,
		&user.AboutMe,
		&user.Privacy,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	return user, nil
}

func createUser(
	db *sql.DB,
	request models.RegisterRequest,
	passwordHash string,
) (*models.User, error) {
	userID, err := uuid.NewV4()
	if err != nil {
		return nil, err
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO users (
			id,
			email,
			password_hash,
			first_name,
			last_name,
			date_of_birth
		)
		VALUES (?, ?, ?, ?, ?, ?)
	`,
		userID.String(),
		request.Email,
		passwordHash,
		request.FirstName,
		request.LastName,
		request.DateOfBirth,
	)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(`
		INSERT INTO profiles (
			user_id,
			nickname,
			about_me
		)
		VALUES (?, ?, ?)
	`,
		userID.String(),
		request.Nickname,
		request.AboutMe,
	)
	if err != nil {
		return nil, err
	}

    // select a generic pfp from DB to assign it
	poolRows, err := tx.Query(`
		SELECT media_id FROM profile_avatars
		WHERE type = 1000 AND user_id IS NULL
	`)
	if err != nil {
		return nil, err
	}
	defer poolRows.Close()

	var poolMediaIDs []string
	for poolRows.Next() {
		var mediaID string
		if err := poolRows.Scan(&mediaID); err != nil {
			return nil, err
		}
		poolMediaIDs = append(poolMediaIDs, mediaID)
	}
	if err := poolRows.Err(); err != nil {
		return nil, err
	}

	if len(poolMediaIDs) > 0 {
		selectedMediaID := poolMediaIDs[rand.Intn(len(poolMediaIDs))]

		_, err = tx.Exec(`
			UPDATE profile_avatars
			SET user_id = ?
			WHERE media_id = ? AND user_id IS NULL
		`, userID.String(), selectedMediaID)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return GetUserByID(db, userID.String())
}