import type { LoanType } from '@/features/loans/types'

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year'

export const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
]

interface LoanStatusEntry {
  count: number
  amount: string
  remainingBalance: string
  totalPaid: string
}

export interface DashboardSummary {
  period: ReportPeriod
  periodSince: string

  borrowers: {
    total: number
    newInPeriod: number
  }

  loans: {
    byStatus: {
      pending: LoanStatusEntry
      approved: LoanStatusEntry
      active: LoanStatusEntry
      paid: LoanStatusEntry
      defaulted: LoanStatusEntry
      canceled: LoanStatusEntry
    }
    activePortfolio: {
      count: number
      totalDisbursed: string
      totalRemaining: string
      totalCollected: string
    }
    periodDisbursements: {
      count: number
      amount: string
    }
  }

  collections: {
    inPeriod: {
      count: number
      amount: string
      principalPortion: string
      interestPortion: string
    }
  }

  capital: {
    allTime: {
      totalInflow: string
      totalOutflow: string
      netCapital: string
    }
    inPeriod: {
      inflow: string
      outflow: string
      net: string
    }
  }
}

export interface OverdueItem {
  loanId: string
  borrower: {
    id: string
    name: string
    email: string
    phone: string
  }
  amount: string
  remainingBalance: string
  earliestOverdueDueDate: string | null
  daysPastDue: number
  type: LoanType
  disbursedAt: string | null
}

export interface PortfolioAtRisk {
  totalPortfolioBalance: string
  totalPortfolioCount: number
  atRiskBalance: string
  atRiskCount: number
  parRatio: string
}
