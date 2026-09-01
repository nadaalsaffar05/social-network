import { request } from './client'
import { buildApiUrl } from '../config/api.js'

export async function getProfile({ includePosts = true } = {}) {
  const data = await request(['api', 'profile'], {
    queryParams: includePosts ? {} : { include_posts: 'false' },
  })
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
    queryParams: userId ? { user_id: userId } : {},
  })
  return data.followers || []
}

export async function getFollowing(userId) {
  const data = await request(['api', 'following'], {
    queryParams: userId ? { user_id: userId } : {},
  })
  return data.following || []
}

export async function followUser(userId) {
  return await request(['api', 'follow'], {
    method: 'POST',
    body: { user_id: userId },
  })
}

export async function getFollowRequests() {
  const data = await request(['api', 'follow-requests'])
  return data.requests || data.follow_requests || []
}

export async function respondToFollowRequest(requestId, action) {
  return await request(['api', 'follow-request', 'respond'], {
    method: 'POST',
    body: {
      request_id: requestId,
      action: action,
    },
  })
}


export async function unfollowUser(userId) {
  return await request(['api', 'unfollow'], {
    method: 'POST',
    body: { user_id: userId },
  })
}

export const getFollowRequests = () => request(['api', 'follow-requests'])

export const respondToFollowRequest = (requestID, action) =>
  request(['api', 'follow-request', 'respond'], {
    method: 'POST',
    body: { request_id: requestID, action },
  })

export const searchUsers = (query) =>
  request(['api', 'users', 'search'], { queryParams: { q: query } })

export async function getPublicProfile(userID) {
  const data = await request(['api', 'users', userID, 'profile'])
  return data.user || data
}

export const isFollowing = (userID) =>
  request(['api', 'is-following'], { queryParams: { user_id: userID } })
