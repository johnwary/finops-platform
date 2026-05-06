import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import type { Loan, LoanStatus, LoanType } from '../types'

interface UseLoansParams {
  status?: LoanStatus
  type?: LoanType
  search?: string
  borrowerId?: string
  cursor?: string
}

export function useLoans(params?: UseLoansParams) {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.type) query.set('type', params.type)
  if (params?.search) query.set('search', params.search)
  if (params?.borrowerId) query.set('borrowerId', params.borrowerId)
  if (params?.cursor) query.set('cursor', params.cursor)
  const qs = query.toString()

  return useQuery({
    queryKey: ['loans', params],
    queryFn: () => apiFetchList<Loan>(`/api/v1/loans${qs ? `?${qs}` : ''}`),
    staleTime: 3 * 60 * 1000,
  })
}
