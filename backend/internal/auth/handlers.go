package auth

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func requireMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	if r.Method == method {
		return true
	}

	writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	return false
}

func trimOptionalString(value *string) *string {
	if value == nil {
		return nil
	}

	trimmedValue := strings.TrimSpace(*value)
	if trimmedValue == "" {
		return nil
	}

	return &trimmedValue
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if !requireMethod(w, r, http.MethodPost) {
		return
	}

	var request RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	request.Email = strings.TrimSpace(request.Email)
	request.FirstName = strings.TrimSpace(request.FirstName)
	request.LastName = strings.TrimSpace(request.LastName)
	request.DateOfBirth = strings.TrimSpace(request.DateOfBirth)
	request.Nickname = trimOptionalString(request.Nickname)
	request.AboutMe = trimOptionalString(request.AboutMe)

	if request.Email == "" || request.Password == "" || request.FirstName == "" || request.LastName == "" || request.DateOfBirth == "" {
		writeError(w, http.StatusBadRequest, "missing required fields")
		return
	}

	if len(request.Password) < 6 {
		writeError(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	if _, err := time.Parse("2006-01-02", request.DateOfBirth); err != nil {
		writeError(w, http.StatusBadRequest, "date_of_birth must use YYYY-MM-DD")
		return
	}

	existingUser, err := getUserByEmail(h.DB, request.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if existingUser != nil {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}

	passwordHash, err := hashPassword(request.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	user, err := createUser(h.DB, request, passwordHash)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create user")
		return
	}

	token, err := createSession(h.DB, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}

	setSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, AuthResponse{Message: "registration successful", User: user})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if !requireMethod(w, r, http.MethodPost) {
		return
	}

	var request LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	request.Email = strings.TrimSpace(request.Email)
	if request.Email == "" || request.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := getUserByEmail(h.DB, request.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	if user == nil || !checkPassword(user.PasswordHash, request.Password) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	token, err := createSession(h.DB, user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}

	setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, AuthResponse{Message: "login successful", User: user})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if !requireMethod(w, r, http.MethodPost) {
		return
	}

	cookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		_ = revokeSession(h.DB, cookie.Value)
	}

	clearSessionCookie(w)
	writeJSON(w, http.StatusOK, AuthResponse{Message: "logout successful"})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	if !requireMethod(w, r, http.MethodGet) {
		return
	}

	user := CurrentUser(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	writeJSON(w, http.StatusOK, user)
}
