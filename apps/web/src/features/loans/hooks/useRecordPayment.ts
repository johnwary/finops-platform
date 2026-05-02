import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import type { RecordPaymentInput } from '../schemas'
import type { LoanPayment } from '../types'

export function useRecordPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & RecordPaymentInput) =>
      apiFetch<LoanPayment>(`/api/v1/loans/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_, { id }) => {
      toast.success('Payment recorded.')
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
  })
}
