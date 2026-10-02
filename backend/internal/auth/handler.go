package auth

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"social-network/internal/enums"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

const (
	minimumRegistrationAge = 18
	maximumRegistrationAge = 65
)

type Handler struct {
	DB *sql.DB
}

func requireMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	if r.Method != method {
		helpers.WriteError(
			w,
			http.StatusMethodNotAllowed,
			"method not allowed",
		)
		return false
	}

	return true
}

func trimOptionalString(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)

	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if !requireMethod(w, r, http.MethodPost) {
		return
	}

	var request models.RegisterRequest

	if err := helpers.ParseJSON(r.Body, &request); err != nil {
		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	request.Email = strings.TrimSpace(request.Email)
	request.FirstName = strings.TrimSpace(request.FirstName)
	request.LastName = strings.TrimSpace(request.LastName)
	request.DateOfBirth = strings.TrimSpace(request.DateOfBirth)
	request.Nickname = trimOptionalString(request.Nickname)
	request.AboutMe = trimOptionalString(request.AboutMe)
	if request.Privacy == 0 {
		request.Privacy = enums.ProfilePrivacyPublic
	}

	if request.Email == "" ||
		request.Password == "" ||
		request.FirstName == "" ||
		request.LastName == "" ||
		request.DateOfBirth == "" {

		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"missing required fields",
		)
		return
	}

	emailCheckContext, cancelEmailCheck := context.WithTimeout(r.Context(), 3*time.Second)
	emailDomainValid, err := emailDomainCanReceiveMail(emailCheckContext, request.Email)
	cancelEmailCheck()
	if err != nil {
		helpers.WriteError(
			w,
			http.StatusServiceUnavailable,
			"could not validate email domain; please try again",
		)
		return
	}
	if !emailDomainValid {
		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"email address has an invalid or unreachable domain",
		)
		return
	}

	if !enums.IsValidProfilePrivacy(request.Privacy) {
		helpers.WriteError(w, http.StatusBadRequest, "invalid privacy setting")
		return
	}

	if !isValidPassword(request.Password) {
		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"password must be at least 6 characters and contain uppercase, lowercase, number, and special character",
		)
		return
	}

	birthDate, err := helpers.ParseDateOnly(request.DateOfBirth)
	if err != nil {
		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"date_of_birth must use YYYY-MM-DD",
		)
		return
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	if birthDate.After(today.AddDate(-minimumRegistrationAge, 0, 0)) ||
		birthDate.Before(today.AddDate(-maximumRegistrationAge, 0, 0)) {
		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"you must be between 18 and 65 years old to register",
		)
		return
	}

	existingUser, err := getUserByEmail(h.DB, request.Email)
	if err != nil {
		helpers.WriteError(
			w,
			http.StatusInternalServerError,
			"database error",
		)
		return
	}

	if existingUser != nil {
		helpers.WriteError(
			w,
			http.StatusConflict,
			"email already registered",
		)
		return
	}

	if request.Nickname != nil {
		taken, err := nicknameTaken(h.DB, *request.Nickname)
		if err != nil {
			helpers.WriteError(
				w,
				http.StatusInternalServerError,
				"failed to validate nickname",
			)
			return
		}
		if taken {
			helpers.WriteError(
				w,
				http.StatusConflict,
				"nickname is already taken",
			)
			return
		}
	}

	passwordHash, err := hashPassword(request.Password)
	if err != nil {
		helpers.WriteError(
			w,
			http.StatusInternalServerError,
			"could not hash password",
		)
		return
	}

	user, err := createUser(h.DB, request, passwordHash)
	if err != nil {
		if errors.Is(err, errNicknameTaken) {
			helpers.WriteError(
				w,
				http.StatusConflict,
				"nickname is already taken",
			)
			return
		}
		helpers.WriteError(
			w,
			http.StatusInternalServerError,
			"could not create user",
		)
		return
	}

	token, err := createSession(h.DB, user.ID)
	if err != nil {
		helpers.WriteError(
			w,
			http.StatusInternalServerError,
			"could not create session",
		)
		return
	}

	setSessionCookie(w, token)

	helpers.WriteJSON(
		w,
		http.StatusCreated,
		models.AuthResponse{
			Message: "registration successful",
			User:    user,
		},
	)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if !requireMethod(w, r, http.MethodPost) {
		return
	}

	var request models.LoginRequest

	if err := helpers.ParseJSON(r.Body, &request); err != nil {
		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	request.Email = strings.TrimSpace(request.Email)

	if request.Email == "" || request.Password == "" {
		helpers.WriteError(
			w,
			http.StatusBadRequest,
			"email and password are required",
		)
		return
	}

	user, err := getUserByEmail(h.DB, request.Email)
	if err != nil {
		helpers.WriteError(
			w,
			http.StatusInternalServerError,
			"database error",
		)
		return
	}

	if user == nil || !checkPassword(user.PasswordHash, request.Password) {
		helpers.WriteError(
			w,
			http.StatusUnauthorized,
			"invalid email or password",
		)
		return
	}

	token, err := createSession(h.DB, user.ID)
	if err != nil {
		helpers.WriteError(
			w,
			http.StatusInternalServerError,
			"could not create session",
		)
		return
	}

	setSessionCookie(w, token)

	helpers.WriteJSON(
		w,
		http.StatusOK,
		models.AuthResponse{
			Message: "login successful",
			User:    user,
		},
	)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if !requireMethod(w, r, http.MethodPost) {
		return
	}

	cookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		if err := revokeSession(h.DB, cookie.Value); err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "could not end session")
			return
		}
	}

	clearSessionCookie(w)

	helpers.WriteJSON(
		w,
		http.StatusOK,
		models.AuthResponse{
			Message: "logout successful",
		},
	)
}
