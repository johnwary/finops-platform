import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import type { LoginInput } from '../schemas'

function authMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Authentication failed.'
}

export function useLogin() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const result = await authClient.signIn.email(input)

      if (result.error) {
        throw new Error(result.error.message ?? 'Unable to sign in.')
      }

      return result.data
    },
    onSuccess: () => {
      navigate('/dashboard')
    },
    meta: {
      getErrorMessage: authMessage,
    },
  })
}
