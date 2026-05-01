import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { DashboardSummary, OverdueItem, PortfolioAtRisk, ReportPeriod } from '../types'

export function useDashboardSummary(period: ReportPeriod) {
  return useQuery({
    queryKey: ['reports', 'summary', period],
    queryFn: () => apiFetch<DashboardSummary>(`/api/v1/reports/summary?period=${period}`),
    staleTime: 3 * 60 * 1000,
  })
}

export function useOverdue() {
  return useQuery({
    queryKey: ['reports', 'overdue'],
    queryFn: () => apiFetch<{ data: OverdueItem[]; meta: { total: number } }>('/api/v1/reports/overdue'),
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
