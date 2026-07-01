import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import { toSearchParams } from '@/lib/query'
import type { BorrowerListItem } from '../types'

interface UseBorrowersParams {
  search?: string
  cursor?: string
  limit?: number
  deleted?: boolean
}

export function useBorrowers(params?: UseBorrowersParams) {
  const qs = toSearchParams({ search: params?.search, cursor: params?.cursor, limit: params?.limit, deleted: params?.deleted })

  return useQuery({
    queryKey: ['borrowers', { search: params?.search, cursor: params?.cursor, limit: params?.limit, deleted: params?.deleted }],
    queryFn: () => apiFetchList<BorrowerListItem>(`/api/v1/borrowers${qs}`),
    staleTime: 3 * 60 * 1000,
  })
}
