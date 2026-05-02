import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { LoanDetail } from '../types'

export function useLoan(id: string) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: () => apiFetch<LoanDetail>(`/api/v1/loans/${id}`),
    staleTime: 3 * 60 * 1000,
    enabled: !!id,
  })
}
