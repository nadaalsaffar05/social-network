import { buildApiUrl } from '../config/api.js'

export async function request(pathSegments, options = {}) {
  const {
    method = 'GET',
    queryParams = {},
    body,
    headers,
    ...fetchOptions
  } = options

  const isFormData = body instanceof FormData
  const hasBody = body !== undefined && body !== null

  const response = await fetch(buildApiUrl(pathSegments, queryParams), {
    ...fetchOptions,
    method,
    credentials: 'include',
    headers: {
      ...(hasBody && !isFormData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    body: hasBody && !isFormData ? JSON.stringify(body) : body,
  })

  const isJSON = response.headers
    .get('content-type')
    ?.includes('application/json')

  const data = isJSON ? await response.json() : null

  if (!response.ok) {
    throw new Error(
      data?.error || response.statusText || 'Something went wrong',
    )
  }

  return data
}
