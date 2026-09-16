import { request } from './client'

const getUser = (data) => data.user || data

export async function getProfile({ includePosts = true } = {}) {
  const data = await request(['api', 'profile'], {
    queryParams: includePosts ? {} : { include_posts: 'false' },
  })
  return getUser(data)
}

export async function updateProfile(profileData) {
  const data = await request(['api', 'profile', 'update'], {
    method: 'POST',
    body: profileData,
  })
  return getUser(data)
}

export function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)

  return request(['api', 'profile', 'avatar'], {
    method: 'POST',
    body: formData,
  })
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

export function followUser(userId) {
  return request(['api', 'follow'], {
    method: 'POST',
    body: { user_id: userId },
  })
}

export async function getFollowRequests() {
  const data = await request(['api', 'follow-requests'])
  return data.requests || data.follow_requests || []
}

export function respondToFollowRequest(requestId, action) {
  return request(['api', 'follow-request', 'respond'], {
    method: 'POST',
    body: {
      request_id: requestId,
      action,
    },
  })
}

export function unfollowUser(userId) {
  return request(['api', 'unfollow'], {
    method: 'POST',
    body: { user_id: userId },
  })
}

export const searchUsers = (query) =>
  request(['api', 'users', 'search'], { queryParams: { q: query } })

export async function getPublicProfile(userId) {
  return getUser(await request(['api', 'users', userId, 'profile']))
}

export const isFollowing = (userId) =>
  request(['api', 'is-following'], { queryParams: { user_id: userId } })
