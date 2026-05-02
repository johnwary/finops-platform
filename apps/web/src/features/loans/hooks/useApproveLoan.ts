import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { Loan } from '../types'

export function useApproveLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Loan>(`/api/v1/loans/${id}/approve`, { method: 'POST', body: '{}' }),
    onSuccess: (_, id) => {
      toast.success('Loan approved.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
  })
}
