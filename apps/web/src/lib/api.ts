export interface ApiErrorPayload {
  code: string
  message: string
  status: number
  fields?: Record<string, string[]>
}

export class ApiError extends Error {
  code: string
  status: number
  fields?: Record<string, string[]>

  constructor(payload: ApiErrorPayload) {
    super(payload.message)
    this.name = 'ApiError'
    this.code = payload.code
    this.status = payload.status
    this.fields = payload.fields
  }
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? {
        code: 'REQUEST_FAILED',
        message: 'Request failed.',
        status: response.status,
      },
    )
  }

  return payload.data as T
}
