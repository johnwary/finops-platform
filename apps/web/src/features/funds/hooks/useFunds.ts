import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch, apiFetchList } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { BusinessFund } from '../types'

// ponytail: fetches first 100 entries, no pagination UI — owner capital moves
// are rare; add cursor paging if a client ever exceeds this.
export function useFunds() {
  return useQuery({
    queryKey: ['funds'],
    queryFn: () => apiFetchList<BusinessFund>('/api/v1/funds?limit=100'),
    staleTime: 3 * 60 * 1000,
  })
}

export interface CreateFundInput {
  amount: number
  dateAdded: string
  remarks?: string
}

export function useCreateFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFundInput) =>
      apiFetch<BusinessFund>('/api/v1/funds', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      toast.success('Capital added.')
      queryClient.invalidateQueries({ queryKey: ['funds'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to add capital.')),
  })
}

export function useWithdrawFund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; remarks?: string }) =>
      apiFetch<BusinessFund>(`/api/v1/funds/${input.id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ remarks: input.remarks }),
      }),
    onSuccess: () => {
      toast.success('Capital withdrawn.')
      queryClient.invalidateQueries({ queryKey: ['funds'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to withdraw capital.')),
  })
}
