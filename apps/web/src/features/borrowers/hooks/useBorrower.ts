import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { BorrowerDetail } from '../types'

export function useBorrower(id: string | undefined) {
  return useQuery({
    queryKey: ['borrower', id],
    queryFn: () => apiFetch<BorrowerDetail>(`/api/v1/borrowers/${id}`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  })
}
