import { useEffect, useState } from "react";

import { createGroupPost } from "../../../api/groups.js";
import { togglePostReaction } from "../../../api/feed.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { usePaginationObserver } from "../../../shared/hooks/usePaginationObserver.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import PostCard from "../../feed/components/PostCard.jsx";
import PostComposer from "../../feed/components/PostComposer.jsx";
import { useGroupPosts } from "../hooks/useGroupPosts.js";
import { GroupPostsSkeleton } from "./GroupSectionSkeletons.jsx";

import "./GroupPosts.css";

export default function GroupPosts({ groupID, currentUserID }) {
  const navigateTo = usePageNavigate();
  const { error: showError } = useToast();

  const {
    posts,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    addPost,
    removePost,
    updatePost,
  } = useGroupPosts(groupID);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [reactingPostID, setReactingPostID] = useState("");
  const [deletingPostID, setDeletingPostID] = useState("");

  const paginationStatus = loadingMore ? "loading-more" : "ready";

  const loadMoreRef = usePaginationObserver({
    hasMore,
    status: paginationStatus,
    loadMore,
  });

  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not load group posts", error);
  }, [error, showError]);

  async function handlePostReaction(postID, reactionType) {
    setReactingPostID(postID);

    try {
      const response = await togglePostReaction(postID, reactionType);

      updatePost(postID, {
        viewer_reaction: response.reaction_type,
        like_count: response.counts.LIKE,
        dislike_count: response.counts.DISLIKE,
      });
    } catch (requestError) {
      showError(
        "Could not update reaction",
        requestError.message || "Please try again.",
      );
    } finally {
      setReactingPostID("");
    }
  }

  async function handleDelete(postID) {
    if (!window.confirm("Delete this post?")) {
      return;
    }

    setDeletingPostID(postID);

    try {
      await removePost(postID);
    } catch (requestError) {
      showError(
        "Could not delete post",
        requestError.message || "Please try again.",
      );
    } finally {
      setDeletingPostID("");
    }
  }

  function handleCreateGroupPost({ content }) {
    return createGroupPost(groupID, content);
  }

  function handleCreated(post) {
    addPost(post);
  }

  if (loading) {
    return <GroupPostsSkeleton />;
  }

  return (
    <section className="group-posts">
      <div className="group-posts-header">
        <span className="group-posts-label">GROUP POSTS</span>

        <button
          type="button"
          className="group-posts-create-button"
          onClick={() => setIsComposerOpen(true)}
        >
          Create Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="group-posts-empty">No posts in this group yet.</div>
      ) : (
        <div className="group-posts-list">
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
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div
          ref={loadMoreRef}
          className="group-posts-scroll-trigger"
          aria-hidden="true"
        />
      )}

      {loadingMore && (
        <GroupPostsSkeleton count={1} pagination />
      )}

      <PostComposer
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        onCreated={handleCreated}
        fixedPrivacy="group"
        createPostRequest={handleCreateGroupPost}
      />
    </section>
  );
}
