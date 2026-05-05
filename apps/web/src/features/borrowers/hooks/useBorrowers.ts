import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import type { BorrowerListItem } from '../types'

interface UseBorrowersParams {
  search?: string
  cursor?: string
  limit?: number
}

export function useBorrowers(params?: UseBorrowersParams) {
  const query = new URLSearchParams()
  if (params?.search) query.set('search', params.search)
  if (params?.cursor) query.set('cursor', params.cursor)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()

  return useQuery({
    queryKey: ['borrowers', { search: params?.search, cursor: params?.cursor, limit: params?.limit }],
    queryFn: () => apiFetchList<BorrowerListItem>(`/api/v1/borrowers${qs ? `?${qs}` : ''}`),
    staleTime: 3 * 60 * 1000,
  })
}
