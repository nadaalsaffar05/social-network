import { useState } from 'react'

import { BASE_API } from '../../../config/api.js'

const fallbackAvatarPaths = [
  'tmp/doof.jpg',
  'tmp/download (1).jpg',
  'tmp/download.jpg',
  'tmp/chinchillamaru.jpg',
]

function getMediaUrl(path) {
  if (!path) return null
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path

  return new URL(`/${String(path).replace(/^\/+/, '')}`, BASE_API).toString()
}

function getFallbackAvatarUrl(seed) {
  const value = String(seed ?? '')
  const index = [...value].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    0,
  ) % fallbackAvatarPaths.length

  return getMediaUrl(fallbackAvatarPaths[index])
}

export default function Avatar({
  avatarPath,
  seed,
  className,
  alt = '',
  onError,
  ...props
}) {
  const fallbackUrl = getFallbackAvatarUrl(seed)
  const sourceUrl = getMediaUrl(avatarPath) ?? fallbackUrl
  const [failedSourceUrl, setFailedSourceUrl] = useState('')
  const src = failedSourceUrl === sourceUrl ? fallbackUrl : sourceUrl

  function handleError(event) {
    if (event.currentTarget.src !== fallbackUrl) {
      setFailedSourceUrl(sourceUrl)
    }
    onError?.(event)
  }

  return <img {...props} className={className} src={src} alt={alt} onError={handleError} />
}
