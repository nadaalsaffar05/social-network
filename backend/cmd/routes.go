package main

import (
	"database/sql"
	"net/http"
	"social-network/internal/api"
	"social-network/internal/auth"
	"social-network/internal/chat"
	"social-network/internal/feed"
	"social-network/internal/groups"
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
	chatHub := chat.NewHub()
	chatHandler := chat.NewHandler(db, chatHub)
	groupHandler := groups.NewHandler(db)
	protected := func(handler http.HandlerFunc) http.Handler { return auth.Middleware(db, handler) }

	mux.HandleFunc("/api/register", authHandler.Register)
	mux.HandleFunc("/api/login", authHandler.Login)
	mux.HandleFunc("/api/logout", authHandler.Logout)
	mux.Handle("/api/profile", protected(api.GetProfile(db)))
	mux.Handle("/api/profile/update", protected(api.UpdateProfile(db)))
	mux.Handle("/api/profile/avatar", protected(api.UpdateAvatar(db)))
	mux.Handle("/api/users/search", protected(api.SearchUsers(db)))
	mux.Handle("/api/users/{user_id}/profile", protected(api.GetPublicProfile(db)))
	mux.Handle("/api/followers", protected(api.GetFollowers(db)))
	mux.Handle("/api/following", protected(api.GetFollowing(db)))
	mux.Handle("/api/follow-requests", protected(api.GetFollowRequests(db)))
	mux.Handle("/api/follow", protected(api.FollowUser(db)))
	mux.Handle("/api/unfollow", protected(api.UnfollowUser(db)))
	mux.Handle("/api/is-follower", protected(api.IsFollower(db)))
	mux.Handle("/api/is-following", protected(api.IsFollowing(db)))
	mux.Handle("/api/follow-request/respond", protected(api.RespondToFollowRequest(db)))

	// Feed routes remain grouped and use the same authentication wrapper.
	mux.Handle("/api/posts", protected(feedHandler.CreatePost))
	mux.Handle("/api/posts/{post_id}", protected(feedHandler.Post))
	mux.Handle("/api/posts/{post_id}/media", protected(feedHandler.UploadPostMedia))
	mux.Handle("/api/posts/{post_id}/comments", protected(feedHandler.Comments))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}", protected(feedHandler.Comment))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}/media", protected(feedHandler.UploadCommentMedia))
	mux.Handle("/api/posts/{post_id}/reaction", protected(feedHandler.TogglePostReaction))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}/reaction", protected(feedHandler.ToggleCommentReaction))
	mux.Handle("/api/feed", protected(feedHandler.GetFeed))

	// Private-message REST API. Real-time WebSocket support is registered later.
	mux.Handle("/api/users/{user_id}/messages", protected(chatHandler.Messages))
	mux.Handle("/api/users/{user_id}/messages/{public_id}", protected(chatHandler.Message))
	mux.Handle("/api/users/{user_id}/messages/{public_id}/reaction", protected(chatHandler.MessageReaction))
	mux.Handle("/api/users/{user_id}/message-request", protected(chatHandler.MessageRequest))
	mux.Handle("/api/message-requests", protected(chatHandler.MessageRequests))
	mux.Handle("/api/conversations", protected(chatHandler.Conversations))
	mux.Handle("/api/users/online", protected(chatHandler.OnlineUsers))
	mux.Handle("/ws", protected(chatHandler.WebSocket))

	// group routes
	mux.Handle("/api/groups", protected(groupHandler.Groups))
	mux.Handle("/api/groups/{group_id}", protected(groupHandler.GetGroupByID))
	mux.Handle("/api/groups/{group_id}/members", protected(groupHandler.GetGroupMembers))
	mux.Handle("/api/groups/{group_id}/join", protected(groupHandler.JoinGroup))
	mux.Handle("/api/groups/{group_id}/join/cancel", protected(groupHandler.CancelJoinRequest))
	mux.Handle("/api/groups/{group_id}/leave", protected(groupHandler.LeaveGroup))
	mux.Handle("/api/groups/{group_id}/join-requests", protected(groupHandler.GetJoinRequests))
	mux.Handle("/api/groups/{group_id}/join-requests/{request_id}/respond", protected(groupHandler.RespondToJoinRequest))
	mux.Handle("/api/group-invites", protected(groupHandler.GetUserInvites))
	mux.Handle("/api/group-invites/{invite_id}/respond", protected(groupHandler.RespondToInvite))
	mux.Handle("/api/groups/{group_id}/invites", protected(groupHandler.Invites))
	mux.Handle("/api/groups/{group_id}/invites/{invite_id}/cancel", protected(groupHandler.CancelInvite))
	mux.Handle("/api/groups/{group_id}/events", protected(groupHandler.Events))
	mux.Handle("/api/groups/{group_id}/events/{event_id}", protected(groupHandler.GetEvent))
	mux.Handle("/api/groups/{group_id}/events/{event_id}/respond", protected(groupHandler.RespondToEvent))
}
