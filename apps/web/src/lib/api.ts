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

  constructor(payload: ApiErrorPayload, options?: ErrorOptions) {
    super(payload.message, options)
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
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...init.headers,
      },
    })
  } catch (cause) {
    throw new ApiError(
      { code: 'NETWORK_ERROR', message: 'Network error — check your connection.', status: 0 },
      { cause },
    )
  }

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
  if (payload?.data === undefined) {
    throw new ApiError({
      code: 'MALFORMED_RESPONSE',
      message: 'Malformed response — missing data.',
      status: 200,
    })
  }
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
  if (payload?.data === undefined) {
    throw new ApiError({
      code: 'MALFORMED_RESPONSE',
      message: 'Malformed response — missing data.',
      status: 200,
    })
  }
  return payload as { data: T[]; meta: ListMeta }
}

function withCursor(path: string, cursor: string | null) {
  const [base, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

// ponytail: browser export walks API pages; add server streaming when CSVs get too large.
export async function apiFetchAllList<T>(path: string, init: RequestInit = {}): Promise<T[]> {
  const all: T[] = []
  let cursor: string | null = null

  do {
    const page: { data: T[]; meta: ListMeta } = await apiFetchList<T>(withCursor(path, cursor), init)
    all.push(...page.data)
    cursor = page.meta.nextCursor
  } while (cursor)

  return all
}

export async function apiFetchVoid(path: string, init: RequestInit = {}): Promise<void> {
  await apiFetchRaw(path, init)
}
