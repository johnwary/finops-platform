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

export function isConflictError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === 'CONFLICT'
}

const apiBaseUrl = import.meta.env.VITE_API_URL ?? ''

async function apiFetchRaw(path: string, init: RequestInit = {}) {
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

  return payload
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const payload = await apiFetchRaw(path, init)
  return payload.data as T
}

export interface ListMeta {
  nextCursor: string | null
  hasMore: boolean
  limit: number
}

export async function apiFetchList<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T[]; meta: ListMeta }> {
  const payload = await apiFetchRaw(path, init)
  return payload as { data: T[]; meta: ListMeta }
}

export async function apiFetchVoid(path: string, init: RequestInit = {}): Promise<void> {
  await apiFetchRaw(path, init)
}
