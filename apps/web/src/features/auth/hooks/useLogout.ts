import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut()

      if (result.error) {
        throw new Error(result.error.message ?? 'Unable to sign out.')
      }
    },
    onSuccess: () => {
      queryClient.clear()
      navigate('/login')
    },
  })
}
