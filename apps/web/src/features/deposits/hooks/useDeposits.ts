import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import { toSearchParams } from '@/lib/query'
import type { DepositListItem, DepositStatus, DepositType } from '../types'

interface UseDepositsParams {
  status?: DepositStatus
  depositType?: DepositType
  depositorId?: string
  cursor?: string
  limit?: number
}

export function useDeposits(params?: UseDepositsParams) {
  const qs = toSearchParams({
    status: params?.status,
    depositType: params?.depositType,
    depositorId: params?.depositorId,
    cursor: params?.cursor,
    limit: params?.limit,
  })
  return useQuery({
    queryKey: ['deposits', params],
    queryFn: () => apiFetchList<DepositListItem>(`/api/v1/deposits${qs}`),
    staleTime: 3 * 60 * 1000,
  })
}
