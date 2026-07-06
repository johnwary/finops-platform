import { useQuery } from '@tanstack/react-query'
import { apiFetch, apiFetchList } from '@/lib/api'
import type { DashboardSummary, OverdueItem, OverdueMeta, PortfolioAtRisk, ReportPeriod } from '../types'

export function useDashboardSummary(period: ReportPeriod) {
  return useQuery({
    queryKey: ['reports', 'summary', period],
    queryFn: () => apiFetch<DashboardSummary>(`/api/v1/reports/summary?period=${period}`),
    staleTime: 3 * 60 * 1000,
  })
}

// Dashboard + Reports only need the first page and meta.total; the endpoint's
// default page (100) covers that. Collections pages via useOverdueCollections.
export function useOverdue() {
  return useQuery({
    queryKey: ['reports', 'overdue'],
    queryFn: () =>
      apiFetchList<OverdueItem>('/api/v1/reports/overdue').then((res) => ({
        data: res.data,
        meta: res.meta as OverdueMeta,
      })),
    staleTime: 3 * 60 * 1000,
  })
}

export function usePortfolioAtRisk() {
  return useQuery({
    queryKey: ['reports', 'portfolio-at-risk'],
    queryFn: () => apiFetch<PortfolioAtRisk>('/api/v1/reports/portfolio-at-risk'),
    staleTime: 3 * 60 * 1000,
  })
}
