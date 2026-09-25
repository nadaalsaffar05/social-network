import { request } from "./client";

function notificationSubjectID(notification) {
  return (
    notification.comment_id ||
    notification.post_id ||
    notification.group_event_id ||
    notification.group_id ||
    notification.follow_request_id ||
    notification.group_invitation_id ||
    notification.group_join_request_id ||
    notification.id
  );
}

function collapseRepeatedNotifications(notifications) {
  const seen = new Set();

  return [...notifications]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    )
    .filter((notification) => {
      const key = [
        notification.type,
        notification.actor?.id || "",
        notificationSubjectID(notification),
      ].join(":");

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function getNotifications() {
  const data = await request(["api", "notifications"]);
  const notifications = collapseRepeatedNotifications(data?.notifications || []);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.is_read)
      .length,
  };
}

export function markNotificationRead(notificationId) {
  return request(["api", "notifications", notificationId, "read"], {
    method: "POST",
  });
}

export function markAllNotificationsRead() {
  return request(["api", "notifications", "read-all"], {
    method: "POST",
  });
}

export function respondToGroupInvitation(invitationId, action) {
  return request(["api", "group-invites", invitationId, "respond"], {
    method: "POST",
    body: { action },
  });
}

export function respondToGroupJoinRequest(groupId, requestId, action) {
  return request(
    ["api", "groups", groupId, "join-requests", requestId, "respond"],
    {
      method: "POST",
      body: { action },
    },
  );
}
