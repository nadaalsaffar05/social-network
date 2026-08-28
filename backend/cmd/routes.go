package main

import (
	"database/sql"
	"net/http"
	"social-network/internal/api"
	"social-network/internal/auth"
	"social-network/internal/feed"
)

func newRouter(db *sql.DB) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
	registerRoutes(mux, db)
	return mux
}

func registerRoutes(mux *http.ServeMux, db *sql.DB) {
	authHandler := &auth.Handler{DB: db}
	feedHandler := feed.NewHandler(db)
	protected := func(handler http.HandlerFunc) http.Handler { return auth.Middleware(db, handler) }

	mux.HandleFunc("/api/register", authHandler.Register)
	mux.HandleFunc("/api/login", authHandler.Login)
	mux.HandleFunc("/api/logout", authHandler.Logout)
	mux.Handle("/api/profile", protected(api.GetProfile(db)))
	mux.Handle("/api/profile/avatar", protected(api.UpdateAvatar(db)))
	mux.Handle("/api/followers", protected(api.GetFollowers(db)))
	mux.Handle("/api/following", protected(api.GetFollowing(db)))
	mux.Handle("/api/follow", protected(api.FollowUser(db)))
	mux.Handle("/api/unfollow", protected(api.UnfollowUser(db)))
	mux.Handle("/api/is-follower", protected(api.IsFollower(db)))
	mux.Handle("/api/is-following", protected(api.IsFollowing(db)))
	mux.Handle("/api/follow-request/respond", protected(api.RespondToFollowRequest(db)))

	// Feed routes remain grouped and use the same authentication wrapper.
	mux.Handle("/api/posts", protected(feedHandler.CreatePost))
	mux.Handle("/api/posts/{post_id}", protected(feedHandler.GetPost))
	mux.Handle("/api/posts/{post_id}/media", protected(feedHandler.UploadPostMedia))
	mux.Handle("/api/posts/{post_id}/comments", protected(feedHandler.Comments))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}/media", protected(feedHandler.UploadCommentMedia))
	mux.Handle("/api/posts/{post_id}/reaction", protected(feedHandler.TogglePostReaction))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}/reaction", protected(feedHandler.ToggleCommentReaction))
	mux.Handle("/api/feed", protected(feedHandler.GetFeed))
}
