import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import { toSearchParams } from '@/lib/query'
import type { Loan, LoanStatus, LoanType } from '../types'

interface UseLoansParams {
  status?: LoanStatus
  type?: LoanType
  search?: string
  borrowerId?: string
  cursor?: string
}

export function useLoans(params?: UseLoansParams) {
  const qs = toSearchParams({ status: params?.status, type: params?.type, search: params?.search, borrowerId: params?.borrowerId, cursor: params?.cursor })

  return useQuery({
    queryKey: ['loans', params],
    queryFn: () => apiFetchList<Loan>(`/api/v1/loans${qs}`),
    staleTime: 3 * 60 * 1000,
  })
}
