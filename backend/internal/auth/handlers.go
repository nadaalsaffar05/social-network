package auth

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func writeJSON(
	w http.ResponseWriter,
	status int,
	data interface{},
) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(data)
}

func writeError(
	w http.ResponseWriter,
	status int,
	message string,
) {
	writeJSON(
		w,
		status,
		map[string]string{
			"error": message,
		},
	)
}

func (h *Handler) Register(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeError(
			w,
			http.StatusMethodNotAllowed,
			"method not allowed",
		)
		return
	}

	var req RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.DateOfBirth = strings.TrimSpace(req.DateOfBirth)

	if req.Nickname != nil {
		nickname := strings.TrimSpace(*req.Nickname)

		if nickname == "" {
			req.Nickname = nil
		} else {
			req.Nickname = &nickname
		}
	}

	if req.AboutMe != nil {
		aboutMe := strings.TrimSpace(*req.AboutMe)

		if aboutMe == "" {
			req.AboutMe = nil
		} else {
			req.AboutMe = &aboutMe
		}
	}

	if req.Email == "" ||
		req.Password == "" ||
		req.FirstName == "" ||
		req.LastName == "" ||
		req.DateOfBirth == "" {

		writeError(
			w,
			http.StatusBadRequest,
			"missing required fields",
		)
		return
	}

	if len(req.Password) < 6 {
		writeError(
			w,
			http.StatusBadRequest,
			"password must be at least 6 characters",
		)
		return
	}

	_, err := time.Parse(
		"2006-01-02",
		req.DateOfBirth,
	)

	if err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"date_of_birth must use YYYY-MM-DD",
		)
		return
	}

	existingUser, err := getUserByEmail(
		h.DB,
		req.Email,
	)

	if err != nil {
		writeError(
			w,
			http.StatusInternalServerError,
			"database error",
		)
		return
	}

	if existingUser != nil {
		writeError(
			w,
			http.StatusConflict,
			"email already registered",
		)
		return
	}

	passwordHash, err :=
		hashPassword(req.Password)

	if err != nil {
		writeError(
			w,
			http.StatusInternalServerError,
			"could not hash password",
		)
		return
	}

	user, err := createUser(
		h.DB,
		req,
		passwordHash,
	)

	if err != nil {
		writeError(
			w,
			http.StatusInternalServerError,
			"could not create user",
		)
		return
	}

	token, err := createSession(
		h.DB,
		user.ID,
	)

	if err != nil {
		writeError(
			w,
			http.StatusInternalServerError,
			"could not create session",
		)
		return
	}

	setSessionCookie(
		w,
		token,
	)

	writeJSON(
		w,
		http.StatusCreated,
		AuthResponse{
			Message: "registration successful",
			User:    user,
		},
	)
}

func (h *Handler) Login(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeError(
			w,
			http.StatusMethodNotAllowed,
			"method not allowed",
		)
		return
	}

	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	req.Email = strings.TrimSpace(req.Email)

	if req.Email == "" ||
		req.Password == "" {

		writeError(
			w,
			http.StatusBadRequest,
			"email and password are required",
		)
		return
	}

	user, err := getUserByEmail(
		h.DB,
		req.Email,
	)

	if err != nil {
		writeError(
			w,
			http.StatusInternalServerError,
			"database error",
		)
		return
	}

	if user == nil ||
		!checkPassword(
			user.PasswordHash,
			req.Password,
		) {

		writeError(
			w,
			http.StatusUnauthorized,
			"invalid email or password",
		)
		return
	}

	token, err := createSession(
		h.DB,
		user.ID,
	)

	if err != nil {
		writeError(
			w,
			http.StatusInternalServerError,
			"could not create session",
		)
		return
	}

	setSessionCookie(
		w,
		token,
	)

	writeJSON(
		w,
		http.StatusOK,
		AuthResponse{
			Message: "login successful",
			User:    user,
		},
	)
}

func (h *Handler) Logout(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodPost {
		writeError(
			w,
			http.StatusMethodNotAllowed,
			"method not allowed",
		)
		return
	}

	cookie, err :=
		r.Cookie(sessionCookieName)

	if err == nil {
		_ = revokeSession(
			h.DB,
			cookie.Value,
		)
	}

	clearSessionCookie(w)

	writeJSON(
		w,
		http.StatusOK,
		AuthResponse{
			Message: "logout successful",
		},
	)
}

func (h *Handler) Me(
	w http.ResponseWriter,
	r *http.Request,
) {
	if r.Method != http.MethodGet {
		writeError(
			w,
			http.StatusMethodNotAllowed,
			"method not allowed",
		)
		return
	}

	user := CurrentUser(r)

	if user == nil {
		writeError(
			w,
			http.StatusUnauthorized,
			"unauthorized",
		)
		return
	}

	writeJSON(
		w,
		http.StatusOK,
		user,
	)
}