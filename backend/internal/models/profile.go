package models

type UserPost struct {
	ID        string   `json:"id"`
	AuthorID  string   `json:"author_id"`
	Content   string   `json:"content"`
	Privacy   int      `json:"privacy"`
	CreatedAt string   `json:"created_at"`
	UpdatedAt string   `json:"updated_at"`
	Media     []string `json:"media,omitempty"`
}

type ProfileResponse struct {
	ID             string     `json:"id"`
	Email          string     `json:"email"`
	FirstName      string     `json:"first_name"`
	LastName       string     `json:"last_name"`
	DateOfBirth    string     `json:"date_of_birth"`
	Nickname       *string    `json:"nickname,omitempty"`
	AboutMe        *string    `json:"about_me,omitempty"`
	Privacy        int        `json:"privacy"`
	AvatarPath     *string    `json:"avatar_path,omitempty"`
	FollowersCount int        `json:"followers_count"`
	FollowingCount int        `json:"following_count"`
	PostsCount     int        `json:"posts_count"`
	Posts          []UserPost `json:"posts"`
}
