import {
  Analytics01Icon,
  CollectionsBookmarkIcon,
  CreditCardIcon,
  DashboardCircleIcon,
  PiggyBankIcon,
  Settings01Icon,
  UserMultiple02Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { matchPath } from 'react-router-dom'

import type { Role } from '@/lib/auth-client'

type NavigationGroup = 'main' | 'workspace'

interface AppRouteDefinition {
  path: string
  title: string
  roles?: Role[]
  navigation?: { group: NavigationGroup; icon: IconSvgElement; end?: boolean }
  breadcrumbs?: { title: string; url?: string }[]
}

export const appRoutes: Record<string, AppRouteDefinition> = {
  dashboard: { path: '/dashboard', title: 'Dashboard', navigation: { group: 'main', icon: DashboardCircleIcon, end: true } },
  settings: { path: '/dashboard/settings', title: 'Settings', roles: ['admin'], navigation: { group: 'workspace', icon: Settings01Icon } },
  loans: { path: '/dashboard/loans', title: 'Loans', navigation: { group: 'main', icon: CreditCardIcon } },
  loanDetail: { path: '/dashboard/loans/:id', title: 'Loan Details', breadcrumbs: [{ title: 'Loans', url: '/dashboard/loans' }, { title: 'Loan Details' }] },
  borrowers: { path: '/dashboard/borrowers', title: 'Borrowers', navigation: { group: 'main', icon: UserMultiple02Icon } },
  borrowerDetail: { path: '/dashboard/borrowers/:id', title: 'Borrower Details', breadcrumbs: [{ title: 'Borrowers', url: '/dashboard/borrowers' }, { title: 'Borrower Details' }] },
  deposits: { path: '/dashboard/deposits', title: 'Deposits', navigation: { group: 'main', icon: PiggyBankIcon } },
  depositDetail: { path: '/dashboard/deposits/:id', title: 'Deposit Details', breadcrumbs: [{ title: 'Deposits', url: '/dashboard/deposits' }, { title: 'Deposit Details' }] },
  depositors: { path: '/dashboard/depositors', title: 'Depositors', navigation: { group: 'main', icon: Wallet01Icon } },
  depositorDetail: { path: '/dashboard/depositors/:id', title: 'Depositor Details', breadcrumbs: [{ title: 'Depositors', url: '/dashboard/depositors' }, { title: 'Depositor Details' }] },
  collections: { path: '/dashboard/collections', title: 'Collections', roles: ['admin', 'manager'], navigation: { group: 'main', icon: CollectionsBookmarkIcon } },
  reports: { path: '/dashboard/reports', title: 'Reports', roles: ['admin', 'manager'], navigation: { group: 'main', icon: Analytics01Icon } },
  login: { path: '/login', title: 'Log in' },
  inviteAccept: { path: '/invite/accept', title: 'Accept invitation' },
  forgotPassword: { path: '/forgot-password', title: 'Forgot password' },
  resetPassword: { path: '/reset-password', title: 'Reset password' },
}

export const allAppRoutes = Object.values(appRoutes)

function navigationItems(group: NavigationGroup) {
  return allAppRoutes
    .filter((route) => route.navigation?.group === group)
    .map((route) => ({
      title: route.title,
      url: route.path,
      icon: route.navigation!.icon,
      end: route.navigation!.end,
      roles: route.roles,
    }))
}

export const navMain = navigationItems('main')
export const navProjects = navigationItems('workspace')

export function dashboardChildPath(path: string) {
  return path.replace('/dashboard/', '')
}

export function loanDetailPath(id: string) {
  return appRoutes.loanDetail.path.replace(':id', id)
}

export function borrowerDetailPath(id: string) {
  return appRoutes.borrowerDetail.path.replace(':id', id)
}

export function depositDetailPath(id: string) {
  return appRoutes.depositDetail.path.replace(':id', id)
}

export function depositorDetailPath(id: string) {
  return appRoutes.depositorDetail.path.replace(':id', id)
}

export function getBreadcrumbTrail(pathname: string): { title: string; url?: string }[] {
  const route = allAppRoutes.find((candidate) => matchPath({ path: candidate.path, end: true }, pathname))
  return route?.breadcrumbs ?? [{ title: route?.title ?? appRoutes.dashboard.title }]
}
