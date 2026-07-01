import { useQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import { toSearchParams } from '@/lib/query'
import type { Invitation, InvitationStatus } from '../types'

export function useInvitations(status?: InvitationStatus) {
  return useQuery({
    queryKey: ['invitations', status],
    queryFn: () => apiFetchList<Invitation>(`/api/v1/invitations${toSearchParams({ limit: 25, status })}`),
    staleTime: 3 * 60 * 1000,
  })
}
