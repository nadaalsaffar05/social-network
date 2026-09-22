import { useEffect, useState } from "react";
import { BellIcon, SpinnerGapIcon } from "@phosphor-icons/react";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondToGroupInvitation,
  respondToGroupJoinRequest,
} from "../../api/notifications";
import { respondToFollowRequest } from "../../api/profile";
import {
  NOTIFICATION_TYPE,
  REQUEST_STATUS,
} from "../../shared/constants/enums";
import PageHeader from "../../shared/components/back-button/PageHeader.jsx";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants";
import NotificationItem from "./NotificationItem";
import { useChatRealtime } from "../chat/realtime/useChatRealtime.js";
import "./NotificationsPage.css";

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

const GROUP_NOTIFICATION_TYPES = new Set([
  NOTIFICATION_TYPE.GROUP_INVITATION,
  NOTIFICATION_TYPE.GROUP_JOIN_REQUEST,
  NOTIFICATION_TYPE.EVENT_CREATED,
  NOTIFICATION_TYPE.EVENT_REMINDER,
]);

const FOLLOW_NOTIFICATION_TYPES = new Set([
  NOTIFICATION_TYPE.FOLLOW_REQUEST,
  NOTIFICATION_TYPE.FOLLOW_ACCEPTED,
  NOTIFICATION_TYPE.NEW_FOLLOWER,
]);

export default function NotificationsPage() {
  const { events, refreshAttentionCounts } = useChatRealtime();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState("");

  async function loadNotifications() {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getNotifications();
        if (active) setNotifications(data.notifications);
      } catch (requestError) {
        if (active)
          setError(requestError.message || "Failed to load notifications");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const latestEvent = events.at(-1);
    if (
      latestEvent?.type === "notification:new" ||
    latestEvent?.type === "notification:resolved" ||
      latestEvent?.type === "follow-request:resolved"
    ) {
      const timer = window.setTimeout(() => {
        void loadNotifications();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [events]);

  async function handleRead(notification) {
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
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      await refreshAttentionCounts();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true })),
      );
    } catch (requestError) {
      setError(requestError.message || "Failed to mark notifications as read");
    }
  }

  async function handleResponse(notification, action) {
    const respond = responseHandlers[notification.type];
    if (!respond) return;

    setProcessingId(notification.id);
    setError("");

    try {
      await respond(notification, action);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                actionable: false,
                action_status:
                  action === "accept"
                    ? REQUEST_STATUS.ACCEPTED
                    : REQUEST_STATUS.DECLINED,
                is_read: true,
              }
            : item,
        ),
      );
      try {
        await markNotificationRead(notification.id);
        await refreshAttentionCounts();
      } catch (requestError) {
        setError(
          requestError.message || "The response was saved but could not be marked as read",
        );
      }
    } catch (requestError) {
      setError(requestError.message || `Failed to ${action} notification`);
    } finally {
      setProcessingId("");
    }
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;
  const groupedNotifications = [
    {
      id: "requests",
      title: "Follow requests",
      items: notifications.filter((notification) =>
        FOLLOW_NOTIFICATION_TYPES.has(notification.type),
      ),
    },
    {
      id: "groups",
      title: "Groups",
      items: notifications.filter((notification) =>
        GROUP_NOTIFICATION_TYPES.has(notification.type),
      ),
    },
    {
      id: "activity",
      title: "Activity",
      items: notifications.filter(
        (notification) =>
          !FOLLOW_NOTIFICATION_TYPES.has(notification.type) &&
          !GROUP_NOTIFICATION_TYPES.has(notification.type),
      ),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <main className="notifications-layout">
      <div className="notifications-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="notifications-container">
        <PageHeader
          title={
            <>
              Notifications
              {unreadCount > 0 && (
                <span className="notifications-badge">{unreadCount}</span>
              )}
            </>
          }
          action={
            unreadCount > 0 && (
              <button
                type="button"
                className="notifications-mark-all"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </button>
            )
          }
        />

        <section className="notifications-content">
          {error && (
            <p className="notifications-error" role="alert">
              {error}
            </p>
          )}
          {loading && (
            <div className="notifications-empty">
              <SpinnerGapIcon
                size={28}
                className="notifications-spinner"
                aria-label="Loading notifications"
              />
              <p className="notifications-empty-text">Loading notifications</p>
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="notifications-empty">
              <div className="notifications-empty-icon-wrap">
                <BellIcon
                  size={48}
                  className="notifications-empty-icon"
                  weight="duotone"
                />
              </div>
              <h2 className="notifications-empty-title">
                No notifications yet
              </h2>
              <p className="notifications-empty-text">
                You’re all caught up. New activity from your circle will appear
                here
              </p>
            </div>
          )}
          {!loading && notifications.length > 0 && (
            groupedNotifications.map((section) => (
              <section
                key={section.id}
                className="notifications-section"
                aria-label={section.title}
              >
                <h2>{section.title}</h2>
                <div className="notifications-list">
                  {section.items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      isProcessing={processingId === notification.id}
                      onRead={handleRead}
                      onRespond={handleResponse}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
