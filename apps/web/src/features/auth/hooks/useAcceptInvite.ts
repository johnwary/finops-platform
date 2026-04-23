import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import type { InviteAcceptInput } from '../schemas'
import { validateInviteToken, type ValidatedInvite } from './useValidateInviteToken'

interface AcceptInviteInput extends InviteAcceptInput {
  token: string
}

export function useAcceptInvite() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async ({ token, name, password }: AcceptInviteInput) => {
      const stagedInvite: ValidatedInvite = await validateInviteToken(token)

      const result = await authClient.signUp.email({
        email: stagedInvite.email,
        name,
        password,
      })

      if (result.error) {
        throw new Error(result.error.message ?? 'Unable to accept invitation.')
      }

      return stagedInvite
    },
    onSuccess: () => {
      toast.success('Invitation accepted.')
      navigate('/dashboard')
    },
  })
}
