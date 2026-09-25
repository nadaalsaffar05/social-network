import { useCallback, useEffect, useState } from "react";

import { getGroupPosts } from "../../../api/groups.js";
import { deletePost } from "../../../api/feed.js";
import { mergePostsByID } from "../../feed/utils/post.js";

const POSTS_LIMIT = 15;

export function useGroupPosts(groupID) {
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getGroupPosts(groupID, {
        limit: POSTS_LIMIT,
      });

      setPosts(response.posts || []);
      setNextCursor(response.next_cursor || "");
    } catch (requestError) {
      setError(requestError.message || "Failed to load group posts");
    } finally {
      setLoading(false);
    }
  }, [groupID]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) {
      return;
    }

    try {
      setLoadingMore(true);
      setError("");

      const response = await getGroupPosts(groupID, {
        cursor: nextCursor,
        limit: POSTS_LIMIT,
      });

      setPosts((currentPosts) =>
        mergePostsByID(currentPosts, response.posts || []),
      );

      setNextCursor(response.next_cursor || "");
    } catch (requestError) {
      setError(requestError.message || "Failed to load more group posts");
    } finally {
      setLoadingMore(false);
    }
  }, [groupID, nextCursor, loadingMore]);

  const addPost = useCallback((post) => {
    setPosts((currentPosts) => [post, ...currentPosts]);
  }, []);

  const updatePost = useCallback((postID, changes) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postID
          ? {
              ...post,
              ...changes,
            }
          : post,
      ),
    );
  }, []);

  const removePost = useCallback(async (postID) => {
    await deletePost(postID);

    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postID),
    );
  }, []);

  useEffect(() => {
    async function loadInitialPosts() {
      await loadPosts();
    }

    void loadInitialPosts();
  }, [loadPosts]);

  return {
    posts,
    loading,
    loadingMore,
    error,

    hasMore: Boolean(nextCursor),

    loadPosts,
    loadMore,

    addPost,
    updatePost,
    removePost,
  };
}
