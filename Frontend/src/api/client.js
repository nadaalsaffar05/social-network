import { buildApiUrl } from '../Config.js'

export async function request(pathSegments, options = {}) {
  const response = await fetch(buildApiUrl(pathSegments), {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }

  return data
}
