import {
  formatLocalDate,
  formatLocalTime,
  isSameLocalDay,
  parseAPITimestamp,
} from "../../../shared/utils/dateTime.js";

export function formatChatMessageTime(value) {
  return formatLocalTime(value, { hour: "numeric", minute: "2-digit" });
}

export function formatChatMessageDay(value) {
  const date = parseAPITimestamp(value);
  if (!date) return value;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(date, today)) return "Today";
  if (isSameLocalDay(date, yesterday)) return "Yesterday";

  return formatLocalDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function mergeMessagesByPublicID(
  currentMessages,
  incomingMessages,
  { prepend = false } = {},
) {
  const knownIDs = new Set(currentMessages.map((message) => message.public_id));
  const additions = incomingMessages.filter(
    (message) => !knownIDs.has(message.public_id),
  );

  return prepend
    ? [...additions, ...currentMessages]
    : [...currentMessages, ...additions];
}
