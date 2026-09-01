import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

import { useToast } from "../../../shared/components/toast/useToast.js";
import { getOnlineUsers } from "../../../api/chat.js";
import { getPublicProfile } from "../../../api/profile.js";
import { createChatSocket } from "./chatSocket.js";
import { ChatRealtimeContext } from "./chatRealtimeContext.js";

function displayName(user) {
  return user?.nickname || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "New message";
}

export function ChatRealtimeProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const socketRef = useRef(null);
  const typingTimersRef = useRef(new Map());
  const locationPathRef = useRef(location.pathname);
  const [status, setStatus] = useState("disconnected");
  const [onlineUserIDs, setOnlineUserIDs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [typingUserIDs, setTypingUserIDs] = useState([]);

  const sendEvent = useCallback((type, data) => socketRef.current?.send(type, data) ?? false, []);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const typingTimers = typingTimersRef.current;

    function showIncomingMessageToast(message, isRequest = false) {
      void getPublicProfile(message.sender_id)
        .then((sender) => {
          showToast({
            title: displayName(sender),
            description: message.content,
            onClick: () => navigate(`/messages/${message.sender_id}`),
          });
        })
        .catch(() => {
          showToast({
            title: isRequest ? "New message request" : "New message",
            description: message.content,
            onClick: () => navigate(`/messages/${message.sender_id}`),
          });
        });
    }

    const socket = createChatSocket({
      onStatus: setStatus,
      onEvent: (event) => {
        setEvents((current) => [...current.slice(-49), event]);

        if (event.type === "presence:sync") {
          setOnlineUserIDs(event.data.user_ids ?? []);
          getOnlineUsers().then((response) => setOnlineUsers(response.users ?? [])).catch(() => {});
        }
        if (event.type === "presence:update") {
          setOnlineUserIDs((current) => event.data.is_online
            ? [...new Set([...current, event.data.user_id])]
            : current.filter((id) => id !== event.data.user_id));
          getOnlineUsers().then((response) => setOnlineUsers(response.users ?? [])).catch(() => {});
        }
        if (event.type === "typing" && event.data.sender_id) {
          const senderID = event.data.sender_id;
          window.clearTimeout(typingTimers.get(senderID));
          setTypingUserIDs((current) => event.data.is_typing
            ? [...new Set([...current, senderID])]
            : current.filter((id) => id !== senderID));
          if (event.data.is_typing) {
            typingTimers.set(senderID, window.setTimeout(() => {
              setTypingUserIDs((current) => current.filter((id) => id !== senderID));
            }, 1500));
          }
        }
        const isViewingSenderConversation = locationPathRef.current === `/messages/${event.data.sender_id}`;
        if (!isViewingSenderConversation) {
          if (event.type === "message:new") showIncomingMessageToast(event.data);
          if (event.type === "message-request:new") showIncomingMessageToast(event.data, true);
        }
      },
    });

    socketRef.current = socket;
    socket.connect();
    return () => {
      typingTimers.forEach((timer) => window.clearTimeout(timer));
      socket.close();
    };
  }, [navigate, showToast]);

  const value = useMemo(() => ({
    status,
    onlineUserIDs,
    onlineUsers,
    typingUserIDs,
    events,
    sendEvent,
  }), [events, onlineUserIDs, onlineUsers, sendEvent, status, typingUserIDs]);

  return <ChatRealtimeContext.Provider value={value}>{children}</ChatRealtimeContext.Provider>;
}
