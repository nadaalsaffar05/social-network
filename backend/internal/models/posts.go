package models

import "social-network/internal/enums"

type CreatePostRequest struct {
    Content  string            `json:"content"`
    Privacy  enums.PostPrivacy `json:"privacy"`
}

type PostResponse struct {
    ID        string            `json:"id"`
    AuthorID  string            `json:"author_id"`
    Content   string            `json:"content"`
    Privacy   enums.PostPrivacy `json:"privacy"`
    CreatedAt string            `json:"created_at"`
}