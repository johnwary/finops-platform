import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/format'

type UseBorrowerMutationOptions<TData, TVariables> = {
  mutationFn: (variables: TVariables) => Promise<TData>
  successMessage: string
  errorMessage: string
  borrowerId?: (data: TData, variables: TVariables) => string | undefined
  handleError?: (err: unknown) => boolean
}

export function useBorrowerMutation<TData, TVariables>({
  mutationFn,
  successMessage,
  errorMessage,
  borrowerId,
  handleError,
}: UseBorrowerMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      const id = borrowerId?.(data, variables)

      toast.success(successMessage)
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
      if (id) queryClient.invalidateQueries({ queryKey: ['borrower', id] })
    },
    onError: (err) => {
      if (handleError?.(err)) return
      toast.error(getErrorMessage(err, errorMessage))
    },
  })
}
