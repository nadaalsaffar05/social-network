import { request } from './client'
import { buildApiUrl } from '../Config.js'

export async function getProfile() {
  const data = await request(['api', 'profile'])
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
  const data = await request(['api', 'followers'], {
    headers: userId ? { user_id: String(userId) } : {},
  })
  return data.followers || []
}

export async function getFollowing(userId) {
  const data = await request(['api', 'following'], {
    headers: userId ? { user_id: String(userId) } : {},
  })
  return data.following || []
}

export async function followUser(userId) {
  return await request(['api', 'follow'], {
    method: 'POST',
    body: { user_id: userId },
  })
}
