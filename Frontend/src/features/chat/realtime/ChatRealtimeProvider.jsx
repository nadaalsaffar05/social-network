import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { useToast } from "../../../shared/components/toast/useToast.js";
import { getOnlineUsers } from "../../../api/chat.js";
import { getFollowRequests, getPublicProfile } from "../../../api/profile.js";
import { getNotifications } from "../../../api/notifications.js";
import { createChatSocket } from "./chatSocket.js";
import { ChatRealtimeContext } from "./chatRealtimeContext.js";
import { getUserDisplayName } from "../../../shared/utils/user.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";

export function ChatRealtimeProvider({ children }) {
  const location = useLocation();
  const navigateTo = usePageNavigate();
  const { showToast } = useToast();
  const socketRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const locationPathRef = useRef(location.pathname);
  const navigateToRef = useRef(navigateTo);
  const [status, setStatus] = useState("disconnected");
  const [onlineUserIDs, setOnlineUserIDs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [typingUserIDs, setTypingUserIDs] = useState([]);
  const [attentionCounts, setAttentionCounts] = useState({
    notifications: 0,
    followRequests: 0,
  });

  const sendEvent = useCallback(
    (type, data) => socketRef.current?.send(type, data) ?? false,
    [],
  );

  const refreshAttentionCounts = useCallback(async () => {
    const [notifications, followRequests] = await Promise.allSettled([
      getNotifications(),
      getFollowRequests(),
    ]);

    setAttentionCounts((current) => ({
      notifications:
        notifications.status === "fulfilled"
          ? notifications.value.unreadCount
          : current.notifications,
      followRequests:
        followRequests.status === "fulfilled"
          ? followRequests.value.length
          : current.followRequests,
    }));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAttentionCounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshAttentionCounts]);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    navigateToRef.current = navigateTo;
  }, [navigateTo]);

  useEffect(() => {
    const typingTimers = typingTimersRef.current;

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
          getOnlineUsers()
            .then((response) => setOnlineUsers(response.users ?? []))
            .catch(() => {});
        }
        if (event.type === "presence:update") {
          setOnlineUserIDs((current) =>
            event.data.is_online
              ? [...new Set([...current, event.data.user_id])]
              : current.filter((id) => id !== event.data.user_id),
          );
          getOnlineUsers()
            .then((response) => setOnlineUsers(response.users ?? []))
            .catch(() => {});
        }
        if (event.type === "typing" && event.data.sender_id) {
          const senderID = event.data.sender_id;
          window.clearTimeout(typingTimers.get(senderID));
          setTypingUserIDs((current) =>
            event.data.is_typing
              ? [...new Set([...current, senderID])]
              : current.filter((id) => id !== senderID),
          );
          if (event.data.is_typing) {
            typingTimers.set(
              senderID,
              window.setTimeout(() => {
                setTypingUserIDs((current) =>
                  current.filter((id) => id !== senderID),
                );
              }, 1500),
            );
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
      socket.close();
    };
  }, [refreshAttentionCounts, showToast]);

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
