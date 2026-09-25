import { BellIcon, SpinnerGapIcon } from "@phosphor-icons/react";

import { NOTIFICATION_TYPE } from "../../shared/constants/enums";
import PageHeader from "../../shared/components/back-button/PageHeader.jsx";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants";
import NotificationItem from "./NotificationItem";
import { useChatRealtime } from "../chat/realtime/useChatRealtime.js";
import { useNotifications } from "./hooks/useNotifications.js";
import "./NotificationsPage.css";

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
  const {
    notifications,
    loading,
    error,
    processingID,
    markingAllRead,
    markRead,
    markAllRead,
    respond,
  } = useNotifications({ events, refreshAttentionCounts });

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read,
  ).length;
  const groupedNotifications = [
    {
      id: "following",
      title: "Following",
      items: notifications.filter((notification) =>
        FOLLOW_NOTIFICATION_TYPES.has(notification.type),
      ),
    },
    {
      id: "groups",
      title: "Groups & events",
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
                onClick={markAllRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? "Marking as read…" : "Mark all as read"}
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
                      isProcessing={processingID === notification.id}
                      onRead={markRead}
                      onRespond={respond}
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
