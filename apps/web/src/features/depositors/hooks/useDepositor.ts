import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { DepositorDetail } from '../types'

export function useDepositor(id: string | undefined) {
  return useQuery({
    queryKey: ['depositor', id],
    queryFn: () => apiFetch<DepositorDetail>(`/api/v1/depositors/${id}`),
    enabled: !!id,
    staleTime: 3 * 60 * 1000,
  })
}
