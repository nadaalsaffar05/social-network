export function parseAPITimestamp(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatLocalDate(value, options) {
  const date = parseAPITimestamp(value)
  return date ? date.toLocaleDateString(undefined, options) : value
}

export function formatLocalDateTime(value, options) {
  const date = parseAPITimestamp(value)
  return date ? date.toLocaleString(undefined, options) : value
}

export function formatLocalTime(value, options) {
  const date = parseAPITimestamp(value)
  return date ? date.toLocaleTimeString(undefined, options) : value
}

export function isSameLocalDay(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
}

// Date-only values such as birthdays are calendar dates, not instants. Build a
// local Date from its parts so formatting cannot shift the displayed day.
export function formatDateOnly(value, options) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '')
  if (!match) return value

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.toLocaleDateString(undefined, options)
}
