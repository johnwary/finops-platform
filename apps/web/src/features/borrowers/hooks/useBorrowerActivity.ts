import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import { toSearchParams } from '@/lib/query'
import type { BorrowerActivityItem } from '../types'

interface UseBorrowerActivityParams {
  cursor?: string
  limit?: number
}

export function useBorrowerActivity(id: string | undefined, params?: UseBorrowerActivityParams) {
  const qs = toSearchParams({ cursor: params?.cursor, limit: params?.limit })

  return useQuery({
    queryKey: ['borrowerActivity', id, { cursor: params?.cursor, limit: params?.limit }],
    queryFn: () => apiFetchList<BorrowerActivityItem>(`/api/v1/borrowers/${id}/activity${qs}`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  })
}
