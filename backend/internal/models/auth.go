package models

import "social-network/internal/enums"

type User struct {
	ID           string               `json:"id"`
	Email        string               `json:"email"`
	PasswordHash string               `json:"-"`
	FirstName    string               `json:"first_name"`
	LastName     string               `json:"last_name"`
	DateOfBirth  string               `json:"date_of_birth"`
	Nickname     *string              `json:"nickname,omitempty"`
	AboutMe      *string              `json:"about_me,omitempty"`
	Privacy      enums.ProfilePrivacy `json:"privacy"`
}

type RegisterRequest struct {
	Email       string  `json:"email"`
	Password    string  `json:"password"`
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	DateOfBirth string  `json:"date_of_birth"`
	Nickname    *string `json:"nickname"`
	AboutMe     *string `json:"about_me"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Message string `json:"message"`
	User    *User  `json:"user,omitempty"`
}
