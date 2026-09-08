import { request } from "./client.js";

export const getPrivateMessages = (userID, { cursor, limit = 30 } = {}) =>
  request(["api", "users", userID, "messages"], {
    queryParams: { limit, ...(cursor ? { cursor } : {}) },
  });

export const sendPrivateMessage = (userID, content) =>
  request(["api", "users", userID, "messages"], {
    method: "POST",
    body: { content },
  });

export const deletePrivateMessage = (userID, publicID) =>
  request(["api", "users", userID, "messages", publicID], {
    method: "DELETE",
  });

export const reactToPrivateMessage = (userID, publicID, emoji) =>
  request(["api", "users", userID, "messages", publicID, "reaction"], {
    method: "POST",
    body: { emoji },
  });

export const getOnlineUsers = () => request(["api", "users", "online"]);

export const getConversations = () => request(["api", "conversations"]);

export const getMessageRequests = () => request(["api", "message-requests"]);

export const acceptMessageRequest = (requesterID) =>
  request(["api", "users", requesterID, "message-request"], { method: "POST" });

export const declineMessageRequest = (requesterID) =>
  request(["api", "users", requesterID, "message-request"], { method: "DELETE" });
