import { useCallback, useEffect, useRef, useState } from "react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondToGroupInvitation,
  respondToGroupJoinRequest,
} from "../../../api/notifications.js";
import { respondToFollowRequest } from "../../../api/profile.js";
import {
  NOTIFICATION_TYPE,
  REQUEST_STATUS,
} from "../../../shared/constants/enums.js";

const responseHandlers = {
  [NOTIFICATION_TYPE.FOLLOW_REQUEST]: (notification, action) =>
    respondToFollowRequest(notification.follow_request_id, action),
  [NOTIFICATION_TYPE.GROUP_INVITATION]: (notification, action) =>
    respondToGroupInvitation(notification.group_invitation_id, action),
  [NOTIFICATION_TYPE.GROUP_JOIN_REQUEST]: (notification, action) =>
    respondToGroupJoinRequest(
      notification.group_id,
      notification.group_join_request_id,
      action,
    ),
};

const refreshEventTypes = new Set([
  "notification:new",
  "notification:resolved",
  "follow-request:resolved",
]);

function resolveNotification(notification, action) {
  if (notification.type !== NOTIFICATION_TYPE.FOLLOW_REQUEST) {
    return {
      ...notification,
      actionable: false,
      action_status:
        action === "accept"
          ? REQUEST_STATUS.ACCEPTED
          : REQUEST_STATUS.DECLINED,
      is_read: true,
    };
  }

  if (action === "decline") return null;

  return {
    ...notification,
    actionable: false,
    action_status: null,
    is_read: true,
    type: NOTIFICATION_TYPE.NEW_FOLLOWER,
  };
}

export function useNotifications({ events, refreshAttentionCounts }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingID, setProcessingID] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const mountedRef = useRef(true);
  const requestIDRef = useRef(0);

  useEffect(() => {
    // React Strict Mode re-runs effects during development. Reset the guard on
    // each setup so the second, real fetch can update this component.
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const requestID = ++requestIDRef.current;
    setLoading(true);

    try {
      const data = await getNotifications();
      if (!mountedRef.current || requestID !== requestIDRef.current) return;

      setNotifications(data.notifications);
      setError("");
    } catch (requestError) {
      if (!mountedRef.current || requestID !== requestIDRef.current) return;

      setError(requestError.message || "Failed to load notifications");
    } finally {
      if (mountedRef.current && requestID === requestIDRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const eventType = events.at(-1)?.type;
    if (!refreshEventTypes.has(eventType)) return undefined;

    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [events, refresh]);

  const markRead = useCallback(
    async (notification) => {
      if (notification.is_read) return;

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item,
        ),
      );

      try {
        await markNotificationRead(notification.id);
        await refreshAttentionCounts();
      } catch (requestError) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: false } : item,
          ),
        );
        setError(requestError.message || "Failed to mark notification as read");
      }
    },
    [refreshAttentionCounts],
  );

  const markAllRead = useCallback(async () => {
    setMarkingAllRead(true);

    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true })),
      );
      await refreshAttentionCounts();
    } catch (requestError) {
      setError(requestError.message || "Failed to mark notifications as read");
    } finally {
      setMarkingAllRead(false);
    }
  }, [refreshAttentionCounts]);

  const respond = useCallback(
    async (notification, action) => {
      const sendResponse = responseHandlers[notification.type];
      if (!sendResponse) return;

      setProcessingID(notification.id);
      setError("");

      try {
        await sendResponse(notification, action);
        setNotifications((current) =>
          current.flatMap((item) => {
            if (item.id !== notification.id) return [item];

            const resolvedNotification = resolveNotification(item, action);
            return resolvedNotification ? [resolvedNotification] : [];
          }),
        );
        await markNotificationRead(notification.id);
        await refreshAttentionCounts();
      } catch (requestError) {
        setError(requestError.message || `Failed to ${action} notification`);
      } finally {
        setProcessingID("");
      }
    },
    [refreshAttentionCounts],
  );

  return {
    notifications,
    loading,
    error,
    processingID,
    markingAllRead,
    refresh,
    markRead,
    markAllRead,
    respond,
  };
}
