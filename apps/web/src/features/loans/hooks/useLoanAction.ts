import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { Loan } from '../types'

type LoanActionInput = { id: string }

type UseLoanActionOptions<TInput extends LoanActionInput> = {
  action: string
  successMessage: string
  errorMessage: string
  body?: (input: TInput) => unknown
}

function defaultBody<TInput extends LoanActionInput>({ id: _id, ...body }: TInput) {
  return body
}

export function useLoanAction<TInput extends LoanActionInput, TResult = Loan>({
  action,
  successMessage,
  errorMessage,
  body = defaultBody,
}: UseLoanActionOptions<TInput>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: TInput) =>
      apiFetch<TResult>(`/api/v1/loans/${input.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(body(input)),
      }),
    onSuccess: (_, { id }) => {
      toast.success(successMessage)
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', id] })
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, errorMessage))
    },
  })
}
