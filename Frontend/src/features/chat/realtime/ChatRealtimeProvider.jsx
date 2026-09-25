import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useToast } from "../../../shared/components/toast/useToast.js";
import {
  getConversations,
  getMessageRequests,
  getOnlineUsers,
} from "../../../api/chat.js";
import { getFollowRequests, getPublicProfile } from "../../../api/profile.js";
import { getNotifications } from "../../../api/notifications.js";
import { createChatSocket } from "./chatSocket.js";
import { ChatRealtimeContext } from "./chatRealtimeContext.js";
import { getUserDisplayName } from "../../../shared/utils/user.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";

const MESSAGE_ATTENTION_EVENT_TYPES = new Set([
  "message:new",
  "message-request:new",
  "message-request:accepted",
  "message-request:declined",
]);

function activeConversationUserID(pathname) {
  return pathname.match(/^\/messages\/([^/]+)$/)?.[1];
}

export function ChatRealtimeProvider({ children }) {
  const location = useLocation();
  const navigateTo = usePageNavigate();
  const { showToast } = useToast();
  const socketRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const locationPathRef = useRef(location.pathname);
  const hasInitializedAttentionRef = useRef(false);
  const navigateToRef = useRef(navigateTo);
  const [status, setStatus] = useState("disconnected");
  const [onlineUserIDs, setOnlineUserIDs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [typingUserIDs, setTypingUserIDs] = useState([]);
  const [attentionCounts, setAttentionCounts] = useState({
    messages: 0,
    notifications: 0,
    followRequests: 0,
  });

  const sendEvent = useCallback(
    (type, data) => socketRef.current?.send(type, data) ?? false,
    [],
  );

  const refreshMessageAttention = useCallback(async () => {
    const [conversations, messageRequests] = await Promise.allSettled([
      getConversations(),
      getMessageRequests(),
    ]);
    const activeUserID = activeConversationUserID(locationPathRef.current);
    const unreadConversationCount =
      conversations.status === "fulfilled"
        ? (conversations.value.conversations ?? []).filter(
            (conversation) =>
              !conversation.is_incoming_request &&
              conversation.user?.id !== activeUserID &&
              conversation.unread_count > 0,
          ).length
        : null;
    const pendingRequestCount =
      messageRequests.status === "fulfilled"
        ? (messageRequests.value.requests ?? []).length
        : null;

    if (unreadConversationCount === null || pendingRequestCount === null) return;

    setAttentionCounts((current) => ({
      ...current,
      messages: unreadConversationCount + pendingRequestCount,
    }));
  }, []);

  const refreshAttentionCounts = useCallback(async () => {
    const messageAttention = refreshMessageAttention();
    const [notifications, followRequests] = await Promise.allSettled([
      getNotifications(),
      getFollowRequests(),
    ]);

    setAttentionCounts((current) => ({
      ...current,
      notifications:
        notifications.status === "fulfilled"
          ? notifications.value.unreadCount
          : current.notifications,
      followRequests:
        followRequests.status === "fulfilled"
          ? followRequests.value.length
          : current.followRequests,
    }));
    await messageAttention;
  }, [refreshMessageAttention]);

  useEffect(() => {
    locationPathRef.current = location.pathname;

    if (!hasInitializedAttentionRef.current) {
      hasInitializedAttentionRef.current = true;
      void refreshAttentionCounts();
      return;
    }

    void refreshMessageAttention();
  }, [location.pathname, refreshAttentionCounts, refreshMessageAttention]);

  useEffect(() => {
    navigateToRef.current = navigateTo;
  }, [navigateTo]);

  useEffect(() => {
    const typingTimers = typingTimersRef.current;

    function refreshOnlineUsers() {
      void getOnlineUsers()
        .then((response) => setOnlineUsers(response.users ?? []))
        .catch(() => {});
    }

    function showRealtimeToast({ title, description, path }) {
      showToast({
        title,
        description,
        onClick: () => navigateToRef.current(path),
      });
    }

    function showIncomingMessageToast(message, isRequest = false) {
      void getPublicProfile(message.sender_id)
        .then((sender) => {
          showRealtimeToast({
            title: getUserDisplayName(sender, "New message"),
            description: message.content,
            path: `/messages/${message.sender_id}`,
          });
        })
        .catch(() => {
          showRealtimeToast({
            title: isRequest ? "New message request" : "New message",
            description: message.content,
            path: `/messages/${message.sender_id}`,
          });
        });
    }

    const socket = createChatSocket({
      onStatus: setStatus,
      onEvent: (event) => {
        setEvents((current) => [...current.slice(-49), event]);

        if (event.type === "presence:sync") {
          setOnlineUserIDs(event.data.user_ids ?? []);
          refreshOnlineUsers();
        }
        if (event.type === "presence:update") {
          setOnlineUserIDs((current) =>
            event.data.is_online
              ? [...new Set([...current, event.data.user_id])]
              : current.filter((id) => id !== event.data.user_id),
          );
          refreshOnlineUsers();
        }
        if (event.type === "typing" && event.data.sender_id) {
          const senderID = event.data.sender_id;
          window.clearTimeout(typingTimers.get(senderID));
          typingTimers.delete(senderID);
          setTypingUserIDs((current) =>
            event.data.is_typing
              ? [...new Set([...current, senderID])]
              : current.filter((id) => id !== senderID),
          );
          if (event.data.is_typing) {
            const timer = window.setTimeout(() => {
              typingTimers.delete(senderID);
              setTypingUserIDs((current) =>
                current.filter((id) => id !== senderID),
              );
            }, 1500);
            typingTimers.set(senderID, timer);
          }
        }
        const senderID = event.data?.sender_id;
        const isViewingSenderConversation =
          senderID && locationPathRef.current === `/messages/${senderID}`;

        if (
          event.type === "follow-request:new" ||
          event.type === "follow-request:resolved" ||
          event.type === "notification:resolved"
        ) {
          void refreshAttentionCounts();
        }
        if (MESSAGE_ATTENTION_EVENT_TYPES.has(event.type))
          void refreshMessageAttention();
        if (event.type === "follow-request:new") {
          showRealtimeToast({
            title: "New follow request",
            description: "Someone requested to follow you",
            path: "/follow-requests",
          });
        }
        if (event.type === "notification:new") {
          void refreshAttentionCounts();
          showRealtimeToast({
            title: "New notification",
            description: "You have new activity",
            path: "/notifications",
          });
        }
        if (!isViewingSenderConversation) {
          if (event.type === "message:new")
            showIncomingMessageToast(event.data);
          if (event.type === "message-request:new")
            showIncomingMessageToast(event.data, true);
        }
      },
    });

    socketRef.current = socket;
    socket.connect();
    return () => {
      typingTimers.forEach((timer) => window.clearTimeout(timer));
      typingTimers.clear();
      socket.close();
    };
  }, [refreshAttentionCounts, refreshMessageAttention, showToast]);

  const value = useMemo(
    () => ({
      status,
      onlineUserIDs,
      onlineUsers,
      typingUserIDs,
      events,
      sendEvent,
      attentionCounts,
      refreshAttentionCounts,
    }),
    [
      attentionCounts,
      events,
      onlineUserIDs,
      onlineUsers,
      refreshAttentionCounts,
      sendEvent,
      status,
      typingUserIDs,
    ],
  );

  return (
    <ChatRealtimeContext.Provider value={value}>
      {children}
    </ChatRealtimeContext.Provider>
  );
}
