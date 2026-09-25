package search

import (
	"database/sql"
	"net/http"
	"strings"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"
)

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
}

func (h *Handler) GlobalSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	response := models.GlobalSearchResponse{
		Query:  query,
		Users:  []models.SearchUserResult{},
		Groups: []models.SearchGroupResult{},
		Posts:  []models.SearchPostResult{},
	}

	if len([]rune(query)) < 2 {
		helpers.WriteJSON(w, http.StatusOK, response)
		return
	}

	typesParam := strings.TrimSpace(r.URL.Query().Get("types"))
	searchTypes := make(map[string]bool)
	if typesParam == "" {
		searchTypes["users"] = true
		searchTypes["groups"] = true
		searchTypes["posts"] = true
	} else {
		for _, t := range strings.Split(typesParam, ",") {
			searchTypes[strings.ToLower(strings.TrimSpace(t))] = true
		}
	}

	if searchTypes["users"] {
		users, err := searchUsers(h.DB, currentUser.ID, query, 15)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to search users")
			return
		}
		response.Users = users
	}

	if searchTypes["groups"] {
		groups, err := searchGroups(h.DB, currentUser.ID, query, 15)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to search groups")
			return
		}
		response.Groups = groups
	}

	if searchTypes["posts"] {
		posts, err := searchAllowedPosts(h.DB, currentUser.ID, query, 15)
		if err != nil {
			helpers.WriteError(w, http.StatusInternalServerError, "failed to search posts")
			return
		}
		response.Posts = posts
	}

	helpers.WriteJSON(w, http.StatusOK, response)
}
