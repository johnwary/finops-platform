import { describe, expect, it } from 'vitest'

import {
  allAppRoutes,
  appRoutes,
  depositDetailPath,
  depositorDetailPath,
  getBreadcrumbTrail,
  loanDetailPath,
} from './app-routes'

describe('application routes', () => {
  it('describes every navigable route and every detail breadcrumb trail', () => {
    expect(allAppRoutes.filter((route) => route.navigation).map((route) => route.path)).toEqual([
      appRoutes.dashboard.path,
      appRoutes.settings.path,
      appRoutes.loans.path,
      appRoutes.borrowers.path,
      appRoutes.deposits.path,
      appRoutes.depositors.path,
      appRoutes.collections.path,
      appRoutes.reports.path,
    ])

    expect(getBreadcrumbTrail('/dashboard/loans/loan-1')).toEqual([
      { title: 'Loans', url: appRoutes.loans.path },
      { title: 'Loan Details' },
    ])
    expect(getBreadcrumbTrail('/dashboard/deposits/deposit-1')).toEqual([
      { title: 'Deposits', url: appRoutes.deposits.path },
      { title: 'Deposit Details' },
    ])
    expect(loanDetailPath('loan-1')).toBe('/dashboard/loans/loan-1')
    expect(depositDetailPath('deposit-1')).toBe('/dashboard/deposits/deposit-1')
    expect(depositorDetailPath('depositor-1')).toBe('/dashboard/depositors/depositor-1')
  })
})
