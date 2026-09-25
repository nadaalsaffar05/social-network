import {
  formatLocalDateTime,
  parseAPITimestamp,
} from "../../../shared/utils/dateTime";
import { getUserDisplayName } from "../../../shared/utils/user";

export function getPostDisplayName(post) {
  return getUserDisplayName(
    {
      nickname: post.author_nickname,
      first_name: post.author_first_name,
      last_name: post.author_last_name,
    },
    "User",
  );
}

export function formatPostTime(value, { detailed = false } = {}) {
  if (detailed) {
    return formatLocalDateTime(value, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const date = parseAPITimestamp(value);
  if (!date) return value;

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours <= 23) return `${elapsedHours}h ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function mergePostsByID(currentPosts, incomingPosts) {
  const knownPostIDs = new Set(currentPosts.map((post) => post.id));
  return [
    ...currentPosts,
    ...incomingPosts.filter((post) => !knownPostIDs.has(post.id)),
  ];
}
