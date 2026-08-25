package models

type ProfileResponse struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	DateOfBirth string  `json:"date_of_birth"`
	Nickname    *string `json:"nickname,omitempty"`
	AboutMe     *string `json:"about_me,omitempty"`
	Privacy     int     `json:"privacy"`
	AvatarPath  *string `json:"avatar_path,omitempty"`
}
