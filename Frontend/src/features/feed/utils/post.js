import { BASE_API } from '../../../config/api.js'

export function getMediaUrl(path) {
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path

  return new URL(`/${String(path).replace(/^\/+/, '')}`, BASE_API).toString()
}

export function getPostDisplayName(post) {
  return (
    post.author_nickname ||
    [post.author_first_name, post.author_last_name].filter(Boolean).join(' ') ||
    'User'
  )
}

export function formatPostTime(value, { detailed = false } = {}) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  if (detailed) {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours <= 23) return `${elapsedHours}h ago`

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}
