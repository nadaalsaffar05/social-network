package auth

import (
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

var (
	lowercasePattern = regexp.MustCompile(`[a-z]`)
	uppercasePattern = regexp.MustCompile(`[A-Z]`)
	numberPattern    = regexp.MustCompile(`[0-9]`)
	specialPattern   = regexp.MustCompile(`[^a-zA-Z0-9]`)
)

func isValidPassword(password string) bool {
	return len(password) >= 6 &&
		lowercasePattern.MatchString(password) &&
		uppercasePattern.MatchString(password) &&
		numberPattern.MatchString(password) &&
		specialPattern.MatchString(password)
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)

	if err != nil {
		return "", err
	}

	return string(hash), nil
}

func checkPassword(passwordHash, password string) bool {
	err := bcrypt.CompareHashAndPassword(
		[]byte(passwordHash),
		[]byte(password),
	)

	return err == nil
}
