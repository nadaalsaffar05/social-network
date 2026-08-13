const backendURL = 'http://localhost:8080'

async function request(path, options = {}) {
  const response = await fetch(`${backendURL}${path}`, {
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

export function registerUser(user) {
  return request('/api/register', {
    method: 'POST',
    body: JSON.stringify(user),
  })
}

export function loginUser(credentials) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function getCurrentUser() {
  return request('/api/me')
}

export function logoutUser() {
  return request('/api/logout', { method: 'POST' })
}
