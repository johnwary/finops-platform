import { useInfiniteQuery } from '@tanstack/react-query'
import { apiFetchAllList, apiFetchList } from '@/lib/api'
import type { OverdueItem, OverdueMeta } from '@/features/dashboard/types'

const PAGE_LIMIT = 100

function fetchOverduePage(cursor: string) {
  const query = cursor ? `&cursor=${cursor}` : ''
  return apiFetchList<OverdueItem>(`/api/v1/reports/overdue?limit=${PAGE_LIMIT}${query}`) as Promise<{
    data: OverdueItem[]
    meta: OverdueMeta
  }>
}

// Worklist: incremental Load More. Total loan count lives in meta.total (same on
// every page); the outstanding balance stat comes from getPortfolioAtRisk, which
// aggregates the whole overdue set server-side (no need to sum client pages).
export function useOverdueCollections() {
  return useInfiniteQuery({
    queryKey: ['reports', 'overdue', 'paged'],
    queryFn: ({ pageParam }) => fetchOverduePage(pageParam),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 3 * 60 * 1000,
  })
}

// CSV export walks every page so the file covers the full overdue set, not just
// what the worklist has loaded. Re-sorts worst-first across pages (per-page DPD
// sort from the API isn't globally ordered).
export async function fetchAllOverdue(): Promise<OverdueItem[]> {
  const all = await apiFetchAllList<OverdueItem>(`/api/v1/reports/overdue?limit=${PAGE_LIMIT}`)
  return all.sort((a, b) => b.daysPastDue - a.daysPastDue)
}
