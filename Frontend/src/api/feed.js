// src/api/feed.js
import { request } from "./client.js";

const mediaFormData = (file, position) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("position", String(position));

  return formData;
};

export const getFeed = ({ cursor, limit = 10 } = {}) =>
  request(["api", "feed"], {
    queryParams: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });

export const getPost = (postId) => request(["api", "posts", postId]);

export const deletePost = (postId) =>
  request(["api", "posts", postId], {
    method: "DELETE",
  });

export const createPost = (payload) =>
  request(["api", "posts"], {
    method: "POST",
    body: payload,
  });

export const uploadPostMedia = (postId, file, position = 0) =>
  request(["api", "posts", postId, "media"], {
    method: "POST",
    body: mediaFormData(file, position),
  });

export const getComments = (postId) =>
  request(["api", "posts", postId, "comments"]);

export const createComment = (postId, payload) =>
  request(["api", "posts", postId, "comments"], {
    method: "POST",
    body: payload,
  });

export const deleteComment = (postId, commentId) =>
  request(["api", "posts", postId, "comments", commentId], {
    method: "DELETE",
  });

export const uploadCommentMedia = (postId, commentId, file, position = 0) =>
  request(["api", "posts", postId, "comments", commentId, "media"], {
    method: "POST",
    body: mediaFormData(file, position),
  });

export const togglePostReaction = (postId, reactionType) =>
  request(["api", "posts", postId, "reaction"], {
    method: "POST",
    body: { reaction_type: reactionType },
  });

export const toggleCommentReaction = (postId, commentId, reactionType) =>
  request(["api", "posts", postId, "comments", commentId, "reaction"], {
    method: "POST",
    body: { reaction_type: reactionType },
  });
