import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import { toSearchParams } from '@/lib/query'
import type { DepositorListItem } from '../types'

interface UseDepositorsParams {
  search?: string
  cursor?: string
  limit?: number
}

export function useDepositors(params?: UseDepositorsParams) {
  const qs = toSearchParams({ search: params?.search, cursor: params?.cursor, limit: params?.limit })
  return useQuery({
    queryKey: ['depositors', { search: params?.search, cursor: params?.cursor, limit: params?.limit }],
    queryFn: () => apiFetchList<DepositorListItem>(`/api/v1/depositors${qs}`),
    staleTime: 3 * 60 * 1000,
  })
}
