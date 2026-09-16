import { request } from "./client";

export async function getNotifications() {
  const data = await request(["api", "notifications"]);

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unread_count || 0,
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
