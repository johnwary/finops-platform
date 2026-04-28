import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import type { Invitation, InvitationStatus } from '../types'

export function useInvitations(status?: InvitationStatus) {
  return useQuery({
    queryKey: ['invitations', status],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '25' })
      if (status) params.set('status', status)
      return apiFetchList<Invitation>(`/api/v1/invitations?${params}`)
    },
    staleTime: 3 * 60 * 1000,
  })
}
