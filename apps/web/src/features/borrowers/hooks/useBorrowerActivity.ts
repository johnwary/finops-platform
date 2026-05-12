import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import type { BorrowerActivityItem } from '../types'

interface UseBorrowerActivityParams {
  cursor?: string
  limit?: number
}

export function useBorrowerActivity(id: string | undefined, params?: UseBorrowerActivityParams) {
  const query = new URLSearchParams()
  if (params?.cursor) query.set('cursor', params.cursor)
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()

  return useQuery({
    queryKey: ['borrowerActivity', id, { cursor: params?.cursor, limit: params?.limit }],
    queryFn: () => apiFetchList<BorrowerActivityItem>(`/api/v1/borrowers/${id}/activity${qs ? `?${qs}` : ''}`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  })
}
