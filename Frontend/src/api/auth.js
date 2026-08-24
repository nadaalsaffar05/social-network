import { request } from './client'

export function registerUser(user) {
  return request(['api', 'register'], {
    method: 'POST',
    body: JSON.stringify(user),
  })
}

export function loginUser(credentials) {
  return request(['api', 'login'], {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function logoutUser() {
  return request(['api', 'logout'], { method: 'POST' })
}
