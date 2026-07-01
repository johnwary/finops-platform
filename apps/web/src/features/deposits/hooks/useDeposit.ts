import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { DepositDetail } from '../types'

export function useDeposit(id: string | undefined) {
  return useQuery({
    queryKey: ['deposit', id],
    queryFn: () => apiFetch<DepositDetail>(`/api/v1/deposits/${id}`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  })
}
