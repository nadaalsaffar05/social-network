import { useCallback, useEffect, useRef, useState } from "react";

import { getProfile, getPublicProfile } from "../../../api/profile.js";
import { mergePostsByID } from "../../feed/utils/post.js";

const POSTS_LIMIT = 10;

export function useProfilePosts({ profileID, isOwnProfile }) {
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [loadedProfileID, setLoadedProfileID] = useState("");
  const loadingMoreRef = useRef(false);
  const requestIDRef = useRef(0);

  const fetchPage = useCallback(
    (cursor = "") => {
      const options = { cursor, limit: POSTS_LIMIT };
      return isOwnProfile
        ? getProfile(options)
        : getPublicProfile(profileID, options);
    },
    [isOwnProfile, profileID],
  );

  const refresh = useCallback(async () => {
    if (!profileID) return null;

    const requestID = ++requestIDRef.current;
    loadingMoreRef.current = false;
    setStatus("loading");
    setError("");

    try {
      const response = await fetchPage();
      if (requestID !== requestIDRef.current) return null;

      setPosts(response.posts ?? []);
      setNextCursor(response.next_cursor ?? "");
      setLoadedProfileID(profileID);
      setStatus("ready");
      return response;
    } catch (requestError) {
      if (requestID === requestIDRef.current) {
        setError(requestError.message || "Failed to load posts");
        setStatus("error");
      }
      return null;
    }
  }, [fetchPage, profileID]);

  const loadMore = useCallback(async () => {
    if (
      loadedProfileID !== profileID ||
      !nextCursor ||
      loadingMoreRef.current
    )
      return;

    const requestID = ++requestIDRef.current;
    loadingMoreRef.current = true;
    setStatus("loading-more");
    setError("");

    try {
      const response = await fetchPage(nextCursor);
      if (requestID !== requestIDRef.current) return;

      setPosts((currentPosts) => mergePostsByID(currentPosts, response.posts ?? []));
      setNextCursor(response.next_cursor ?? "");
      setStatus("ready");
    } catch (requestError) {
      if (requestID === requestIDRef.current) {
        setError(requestError.message || "Failed to load more posts");
        setStatus("ready");
      }
    } finally {
      if (requestID === requestIDRef.current) {
        loadingMoreRef.current = false;
      }
    }
  }, [fetchPage, loadedProfileID, nextCursor, profileID]);

  const updatePost = useCallback((postID, changes) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === postID ? { ...post, ...changes } : post,
      ),
    );
  }, []);

  const removePost = useCallback((postID) => {
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postID));
  }, []);

  useEffect(() => {
    loadingMoreRef.current = false;
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return {
    posts,
    status:
      loadedProfileID === profileID || status === "error" ? status : "loading",
    error,
    hasMore: loadedProfileID === profileID && Boolean(nextCursor),
    loadMore,
    refresh,
    removePost,
    updatePost,
  };
}
