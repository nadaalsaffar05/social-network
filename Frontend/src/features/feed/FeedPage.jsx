import "./FeedPage.css";
import "../../shared/styles/components/PostComposer.css";
import { useEffect, useState } from "react";
import { PlusCircle } from "@phosphor-icons/react";
import {
  cancelFollowRequest,
  followUser,
  getFollowing,
  getProfile,
  unfollowUser,
} from "../../api/profile.js";
import { togglePostReaction } from "../../api/feed.js";
import FeedNavigation from "./components/FeedNavigation.jsx";
import GradientWaves from "./components/GradientWaves.jsx";
import PostComposer from "./components/PostComposer.jsx";
import PostCard from "./components/PostCard.jsx";
import GlobalSearchBar from "./components/GlobalSearchBar.jsx";
import { GRADIENT_WAVE_PROPS } from "./constants.js";
import { useFeed } from "./hooks/useFeed.js";
import Avatar from "../../shared/components/avatar/Avatar.jsx";
import { useChatRealtime } from "../chat/realtime/useChatRealtime.js";
import { getUserDisplayName } from "../../shared/utils/user.js";
import { usePageNavigate } from "../../shared/components/back-button/usePageBack.js";
import { PROFILE_PRIVACY } from "../../shared/constants/enums.js";
import { usePaginationObserver } from "../../shared/hooks/usePaginationObserver.js";
import { useDevice } from "../../shared/hooks/useDevice.js";

export default function FeedPage() {
  const navigateTo = usePageNavigate();
  const {
    posts,
    status,
    error,
    hasMore,
    refresh,
    loadMore,
    removePost,
    updatePost,
  } = useFeed();
  const loadMoreRef = usePaginationObserver({ hasMore, status, loadMore });
  const { isMobile } = useDevice();
  const [currentUserID, setCurrentUserID] = useState("");
  const [currentProfile, setCurrentProfile] = useState(null);
  const [deletingPostID, setDeletingPostID] = useState("");
  const [operationError, setOperationError] = useState("");
  const [reactingPostID, setReactingPostID] = useState("");
  const [followingIDs, setFollowingIDs] = useState(new Set());
  const [requestedIDs, setRequestedIDs] = useState(new Set());
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const { onlineUsers } = useChatRealtime();

  useEffect(() => {
    getProfile({ includePosts: false })
      .then((profile) => {
        setCurrentUserID(profile.id);
        setCurrentProfile(profile);
      })
      .catch(() => {
        setCurrentUserID("");
        setCurrentProfile(null);
      });
  }, []);

  useEffect(() => {
    let active = true;

    getFollowing()
      .then((followingUsers) => {
        if (!active) return;
        const nextFollowingIDs = new Set(followingUsers.map((user) => user.id));
        setFollowingIDs(nextFollowingIDs);
      })
      .catch(() => {
        if (!active) return;
        setFollowingIDs(new Set());
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleDelete(postID) {
    if (!window.confirm("Delete this post?")) return;

    setDeletingPostID(postID);
    setOperationError("");

    try {
      await removePost(postID);
    } catch (requestError) {
      setOperationError(requestError.message || "Failed to delete the post");
    } finally {
      setDeletingPostID("");
    }
  }

  async function handlePostReaction(postID, reactionType) {
    setReactingPostID(postID);
    setOperationError("");

    try {
      const response = await togglePostReaction(postID, reactionType);
      updatePost(postID, {
        viewer_reaction: response.reaction_type,
        like_count: response.counts.LIKE,
        dislike_count: response.counts.DISLIKE,
      });
    } catch (requestError) {
      setOperationError(requestError.message || "Failed to update reaction");
    } finally {
      setReactingPostID("");
    }
  }

  async function handleFollowUser(userID) {
    try {
      const response = await followUser(userID);
      if (response.status === "following") {
        setFollowingIDs((current) => new Set(current).add(userID));
      } else if (response.status === "pending") {
        setRequestedIDs((current) => new Set(current).add(userID));
      }
    } catch (requestError) {
      setOperationError(requestError.message || "Failed to follow this user");
    }
  }

  async function handleUnfollowUser(userID) {
    try {
      await unfollowUser(userID);
      setFollowingIDs((current) => {
        const next = new Set(current);
        next.delete(userID);
        return next;
      });
    } catch (requestError) {
      setOperationError(requestError.message || "Failed to unfollow this user");
    }
  }

  async function handleCancelFollowRequest(userID) {
    try {
      await cancelFollowRequest(userID);
      setRequestedIDs((current) => {
        const next = new Set(current);
        next.delete(userID);
        return next;
      });
    } catch (requestError) {
      setOperationError(
        requestError.message || "Failed to cancel follow request",
      );
    }
  }

  return (
    <main className="feed-page">
      <div className="feed-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>
      <header className={`feed-topbar${isMobile ? " feed-topbar--mobile" : ""}`}>
        <div className="feed-topbar__inner">
          {isMobile && (
            <span className="feed-topbar__site-name">Loop</span>
          )}
          <GlobalSearchBar />
        </div>
      </header>

      {!isMobile ? (
        <aside className="feed-left-sidebar">
          <FeedNavigation
            onCreatePost={() => setIsComposerOpen(true)}
            profile={currentProfile}
          />
        </aside>
      ) : (
        <FeedNavigation
          onCreatePost={() => setIsComposerOpen(true)}
          profile={currentProfile}
          isMobile
        />
      )}

      <div className="feed-layout">
        <section className="feed-main">
          <section className="feed-posts" aria-label="Feed posts">
            {status === "loading" && (
              <p className="feed-message">Loading posts…</p>
            )}

            {status === "error" && (
              <div className="feed-message feed-error" role="alert">
                <p>Couldn’t load the feed: {error}</p>
                <button type="button" onClick={refresh}>
                  Try again
                </button>
              </div>
            )}

            {status !== "loading" && !error && posts.length === 0 && (
              <div className="feed-empty" role="status">
                <span className="feed-empty__orbit" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <h2>Your feed is quiet</h2>
                <p>Posts from your circle will show up here when they share.</p>
              </div>
            )}

            {operationError && (
              <p className="feed-message feed-error" role="alert">
                {operationError}
              </p>
            )}

            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserID={currentUserID}
                isReacting={reactingPostID === post.id}
                isDeleting={deletingPostID === post.id}
                onLike={() => handlePostReaction(post.id, "LIKE")}
                onComment={() => navigateTo(`/posts/${post.id}`)}
                onDelete={() => handleDelete(post.id)}
                onOpen={() => navigateTo(`/posts/${post.id}`)}
                onAuthorOpen={() => navigateTo(`/profile/${post.author_id}`)}
                onFollow={
                  post.author_privacy === PROFILE_PRIVACY.PUBLIC
                    ? followingIDs.has(post.author_id)
                      ? () => handleUnfollowUser(post.author_id)
                      : requestedIDs.has(post.author_id)
                        ? () => handleCancelFollowRequest(post.author_id)
                        : () => handleFollowUser(post.author_id)
                    : undefined
                }
                followLabel={
                  followingIDs.has(post.author_id)
                    ? "Unfollow"
                    : requestedIDs.has(post.author_id)
                      ? "Cancel request"
                      : "Follow"
                }
              />
            ))}

            {hasMore && (
              <div
                ref={loadMoreRef}
                className="feed-scroll-trigger"
                aria-hidden="true"
              />
            )}

            {status === "loading-more" && (
              <p className="feed-loading-more">Loading more posts…</p>
            )}
          </section>
        </section>

        <aside className="feed-right-sidebar" aria-label="Your feed sidebar">
          {currentProfile && (
            <button
              className="feed-profile-link"
              type="button"
              onClick={() => navigateTo("/profile")}
            >
              <Avatar
                className="feed-profile-link__avatar"
                avatarPath={currentProfile.avatar_path}
                seed={currentProfile.id}
                alt=""
              />
              <span>{getUserDisplayName(currentProfile, "Your profile")}</span>
            </button>
          )}

          <section
            className="feed-active-friends border-glow"
            aria-label="Active friends"
          >
            <div className="feed-active-friends__heading">
              <h2>Active friends</h2>
              <span>{onlineUsers.length}</span>
            </div>
            {onlineUsers.length > 0 ? (
              <ul>
                {onlineUsers.slice(0, 4).map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => navigateTo(`/profile/${user.id}`)}
                    >
                      <Avatar
                        avatarPath={user.avatar_path}
                        seed={user.id}
                        alt=""
                      />
                      <span>{getUserDisplayName(user, "Friend")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No friends are online</p>
            )}
          </section>
        </aside>

      </div>
      <PostComposer
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        onCreated={refresh}
      />

      <button
        type="button"
        className="feed-fab  border-glow"
        onClick={() => setIsComposerOpen(true)}
        aria-label="Create post"
      >
        <PlusCircle size={28} weight="fill" />
      </button>
    </main>
  );
}
