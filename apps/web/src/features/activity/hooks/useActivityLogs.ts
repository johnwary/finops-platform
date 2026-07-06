import { useInfiniteQuery } from '@tanstack/react-query'
import { apiFetchList } from '@/lib/api'
import type { ActivityLog } from '../types'

const PAGE_LIMIT = 20

export function useActivityLogs() {
  return useInfiniteQuery({
    queryKey: ['activity-logs'],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam ? `&cursor=${pageParam}` : ''
      return apiFetchList<ActivityLog>(`/api/v1/activity?limit=${PAGE_LIMIT}${cursor}`)
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 60 * 1000,
  })
}
