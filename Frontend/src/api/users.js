import { buildApiUrl } from '../Config.js'

export async function getProfile() {
  const url = buildApiUrl(['api', 'profile'])
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch profile')
  }

  return data.user || data
}

