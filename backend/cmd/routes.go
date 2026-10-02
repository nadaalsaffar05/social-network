package main

import (
	"database/sql"
	"net/http"
	"social-network/internal/auth"
	"social-network/internal/chat"
	"social-network/internal/feed"
	"social-network/internal/groups"
	"social-network/internal/notifications"
	"social-network/internal/profile"
	"social-network/internal/search"
)

func newRouter(db *sql.DB) *http.ServeMux {
	mux := http.NewServeMux()
	mux.Handle("/tmp/", cacheStaticMedia(http.StripPrefix("/tmp/", http.FileServer(http.Dir("tmp")))))
	mux.Handle("/uploads/", cacheStaticMedia(http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads")))))
	registerRoutes(mux, db)
	return mux
}

func cacheStaticMedia(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
		next.ServeHTTP(w, r)
	})
}

func registerRoutes(mux *http.ServeMux, db *sql.DB) {
	authHandler := &auth.Handler{DB: db}
	chatHub := chat.NewHub()
	feedHandler := feed.NewHandler(db, chatHub)
	chatHandler := chat.NewHandler(db, chatHub)
	groupHandler := groups.NewHandler(db, chatHub)
	notificationHandler := notifications.NewHandler(db)
	searchHandler := search.NewHandler(db)
	chatHandler.SetGroupSocketHandlers(groupHandler.HandleSocketEvent, groupHandler.HandleSocketDisconnect)
	protected := func(handler http.HandlerFunc) http.Handler { return auth.Middleware(db, handler) }

	mux.HandleFunc("/api/register", authHandler.Register)
	mux.HandleFunc("/api/login", authHandler.Login)
	mux.HandleFunc("/api/logout", authHandler.Logout)
	mux.Handle("/api/search", protected(searchHandler.GlobalSearch))
	mux.Handle("/api/profile", protected(profile.GetProfile(db)))
	mux.Handle("/api/profile/update", protected(profile.UpdateProfile(db)))
	mux.Handle("/api/profile/avatar", protected(profile.UpdateAvatar(db)))
	mux.Handle("/api/users/search", protected(profile.SearchUsers(db)))
	mux.Handle("/api/users/{user_id}/profile", protected(profile.GetPublicProfile(db)))
	mux.Handle("/api/followers", protected(profile.GetFollowers(db)))
	mux.Handle("/api/following", protected(profile.GetFollowing(db)))
	mux.Handle("/api/follow-requests", protected(profile.GetFollowRequests(db)))
	mux.Handle("/api/follow", protected(profile.FollowUser(db, chatHub)))
	mux.Handle("/api/unfollow", protected(profile.UnfollowUser(db)))
	mux.Handle("/api/is-follower", protected(profile.IsFollower(db)))
	mux.Handle("/api/is-following", protected(profile.IsFollowing(db)))
	mux.Handle("/api/follow-request/respond", protected(profile.RespondToFollowRequest(db, chatHub)))
	mux.Handle("/api/follow-request/cancel", protected(profile.CancelFollowRequest(db, chatHub)))
	mux.Handle("/api/notifications", protected(notificationHandler.Notifications))
	mux.Handle("/api/notifications/read-all", protected(notificationHandler.MarkAllRead))
	mux.Handle("/api/notifications/{notification_id}/read", protected(notificationHandler.MarkRead))

	mux.Handle("/api/posts", protected(feedHandler.CreatePost))
	mux.Handle("/api/posts/{post_id}", protected(feedHandler.Post))
	mux.Handle("/api/posts/{post_id}/media", protected(feedHandler.UploadPostMedia))
	mux.Handle("/api/posts/{post_id}/comments", protected(feedHandler.Comments))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}", protected(feedHandler.Comment))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}/media", protected(feedHandler.UploadCommentMedia))
	mux.Handle("/api/posts/{post_id}/reaction", protected(feedHandler.TogglePostReaction))
	mux.Handle("/api/posts/{post_id}/comments/{comment_id}/reaction", protected(feedHandler.ToggleCommentReaction))
	mux.Handle("/api/feed", protected(feedHandler.GetFeed))

	mux.Handle("/api/users/{user_id}/messages", protected(chatHandler.Messages))
	mux.Handle("/api/users/{user_id}/messages/{public_id}", protected(chatHandler.Message))
	mux.Handle("/api/users/{user_id}/messages/{public_id}/reaction", protected(chatHandler.MessageReaction))
	mux.Handle("/api/users/{user_id}/message-request", protected(chatHandler.MessageRequest))
	mux.Handle("/api/message-requests", protected(chatHandler.MessageRequests))
	mux.Handle("/api/conversations", protected(chatHandler.Conversations))
	mux.Handle("/api/users/online", protected(chatHandler.OnlineUsers))
	mux.Handle("/ws", protected(chatHandler.WebSocket))

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
	mux.Handle("/api/groups/{group_id}/events/{event_id}/respond", protected(groupHandler.RespondToEvent))
	mux.Handle("/api/groups/{group_id}/messages", protected(groupHandler.GroupMessages))
	mux.Handle("/api/groups/{group_id}/messages/{public_id}/reaction", protected(groupHandler.GroupMessageReaction))
	mux.Handle("/api/groups/{group_id}/posts", protected(groupHandler.Posts))
}
