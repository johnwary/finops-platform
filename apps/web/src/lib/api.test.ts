import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetchAllList } from './api'

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function pathWithQuery(input: unknown) {
  const url = new URL(String(input), 'http://test.local')
  return `${url.pathname}${url.search}`
}

describe('apiFetchAllList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('walks cursor pages without dropping query filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        data: ['first'],
        meta: { nextCursor: 'loan-1', hasMore: true, limit: 100 },
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: ['second'],
        meta: { nextCursor: null, hasMore: false, limit: 100 },
      }))

    await expect(apiFetchAllList<string>('/api/v1/loans?limit=100&status=ACTIVE')).resolves.toEqual([
      'first',
      'second',
    ])

    expect(fetchMock.mock.calls.map(([url]) => pathWithQuery(url))).toEqual([
      '/api/v1/loans?limit=100&status=ACTIVE',
      '/api/v1/loans?limit=100&status=ACTIVE&cursor=loan-1',
    ])
  })
})
