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

export async function uploadAvatar(file) {
  const url = buildApiUrl(['api', 'profile', 'avatar'])
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  })

  const responseText = await response.text()
  let data
  try {
    data = JSON.parse(responseText)
  } catch {
    if (!response.ok) {
      throw new Error(responseText || `Upload failed with status ${response.status}`)
    }
    throw new Error('Invalid response received from server')
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to upload avatar')
  }

  return data
}

export async function getFollowers(userId) {
  const url = buildApiUrl(['api', 'followers'], userId ? { user_id: userId } : {})
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch followers')
  }

  return data.followers || []
}

export async function getFollowing(userId) {
  const url = buildApiUrl(['api', 'following'], userId ? { user_id: userId } : {})
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to fetch following')
  }

  return data.following || []
}


