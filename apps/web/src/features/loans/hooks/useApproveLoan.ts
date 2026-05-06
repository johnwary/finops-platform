import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { ApproveLoanInput } from '../schemas'
import type { Loan } from '../types'

export function useApproveLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & ApproveLoanInput) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (_, { id }) => {
      toast.success('Loan approved.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
  })
}
