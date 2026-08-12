package auth

import (
	"database/sql"
	"errors"

	"github.com/gofrs/uuid/v5"
)

func getUserByEmail(db *sql.DB, email string) (*User, error) {
	user := &User{}

	err := db.QueryRow(`
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
		WHERE u.email = ?
	`, email).Scan(
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

func getUserByID(db *sql.DB, userID string) (*User, error) {
	user := &User{}

	err := db.QueryRow(`
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
		WHERE u.id = ?
	`, userID).Scan(
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
	req RegisterRequest,
	passwordHash string,
) (*User, error) {

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
		req.Email,
		passwordHash,
		req.FirstName,
		req.LastName,
		req.DateOfBirth,
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
		req.Nickname,
		req.AboutMe,
	)

	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return getUserByID(db, userID.String())
}