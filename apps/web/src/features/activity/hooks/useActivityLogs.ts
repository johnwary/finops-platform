import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ActivityLog } from '../types'

export function useActivityLogs() {
  return useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => apiFetch<ActivityLog[]>('/api/v1/activity?limit=100'),
    staleTime: 60 * 1000,
  })
}
