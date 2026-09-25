import { request } from "./client";

// Groups
export function getGroups({
  filter = "discover",
  cursor = "",
  limit = 15,
} = {}) {
  return request(["api", "groups"], {
    queryParams: {
      filter,
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });
}

export function getGroupById(groupID) {
  return request(["api", "groups", groupID]);
}

export function createGroup(title, description) {
  return request(["api", "groups"], {
    method: "POST",
    body: {
      title,
      description,
    },
  });
}

export function getGroupMembers(groupID, { cursor = "", limit = 10 } = {}) {
  return request(["api", "groups", groupID, "members"], {
    queryParams: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });
}

// Join/leave
export function joinGroup(groupID) {
  return request(["api", "groups", groupID, "join"], {
    method: "POST",
  });
}

export function cancelJoinRequest(groupID) {
  return request(["api", "groups", groupID, "join", "cancel"], {
    method: "DELETE",
  });
}

export function leaveGroup(groupID) {
  return request(["api", "groups", groupID, "leave"], {
    method: "DELETE",
  });
}

// Join requests
export function getJoinRequests(groupID, { cursor = "", limit = 10 } = {}) {
  return request(["api", "groups", groupID, "join-requests"], {
    queryParams: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });
}

export function respondToJoinRequest(groupID, requestID, action) {
  return request(
    ["api", "groups", groupID, "join-requests", requestID, "respond"],
    {
      method: "POST",
      body: {
        action,
      },
    },
  );
}

// Events
export function getGroupEvents(groupID, { cursor = "", limit = 10 } = {}) {
  return request(["api", "groups", groupID, "events"], {
    queryParams: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });
}

export function createGroupEvent(groupID, title, description, startsAt) {
  return request(["api", "groups", groupID, "events"], {
    method: "POST",
    body: {
      title,
      description,
      starts_at: startsAt,
    },
  });
}

export function respondToGroupEvent(groupID, eventID, action) {
  return request(["api", "groups", groupID, "events", eventID, "respond"], {
    method: "POST",
    body: {
      action,
    },
  });
}

// Posts
export function getGroupPosts(groupID, { cursor = "", limit = 15 } = {}) {
  return request(["api", "groups", groupID, "posts"], {
    queryParams: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });
}

export function createGroupPost(groupID, content) {
  return request(["api", "groups", groupID, "posts"], {
    method: "POST",
    body: {
      content,
    },
  });
}

// Group chat
export function getGroupMessages(groupID, { cursor = "", limit = 20 } = {}) {
  return request(["api", "groups", groupID, "messages"], {
    queryParams: {
      limit,
      ...(cursor ? { cursor } : {}),
    },
  });
}

export function sendGroupMessage(groupID, content) {
  return request(["api", "groups", groupID, "messages"], {
    method: "POST",
    body: {
      content,
    },
  });
}

export function reactToGroupMessage(groupID, publicID, emoji) {
  return request(["api", "groups", groupID, "messages", publicID, "reaction"], {
    method: "POST",
    body: {
      emoji,
    },
  });
}
