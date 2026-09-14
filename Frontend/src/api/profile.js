import { request } from './client'

export async function getProfile({ includePosts = true } = {}) {
  const data = await request(['api', 'profile'], {
    queryParams: includePosts ? {} : { include_posts: 'false' },
  })
  return data.user || data
}

export async function updateProfile(profileData) {
  const data = await request(['api', 'profile', 'update'], {
    method: 'POST',
    body: profileData,
  })
  return data.user || data
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

export async function followUser(userId) {
  return request(['api', 'follow'], {
    method: 'POST',
    body: { user_id: userId },
  })
}

export async function getFollowRequests() {
  const data = await request(['api', 'follow-requests'])
  return data.requests || data.follow_requests || []
}

export async function respondToFollowRequest(requestId, action) {
  return request(['api', 'follow-request', 'respond'], {
    method: 'POST',
    body: {
      request_id: requestId,
      action: action,
    },
  })
}

export async function unfollowUser(userId) {
  return request(['api', 'unfollow'], {
    method: 'POST',
    body: { user_id: userId },
  })
}

export const searchUsers = (query) =>
  request(['api', 'users', 'search'], { queryParams: { q: query } })

export async function getPublicProfile(userID) {
  const data = await request(['api', 'users', userID, 'profile'])
  return data.user || data
}

export const isFollowing = (userID) =>
  request(['api', 'is-following'], { queryParams: { user_id: userID } })
