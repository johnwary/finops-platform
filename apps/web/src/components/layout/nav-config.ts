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

import type { NavMainItem } from '@/components/layout/NavMain'
import type { NavProjectItem } from '@/components/layout/NavProjects'

export const navMain: NavMainItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: DashboardCircleIcon, end: true },
  { title: 'Loans', url: '/dashboard/loans', icon: CreditCardIcon },
  { title: 'Borrowers', url: '/dashboard/borrowers', icon: UserMultiple02Icon },
  { title: 'Deposits', url: '/dashboard/deposits', icon: PiggyBankIcon },
  { title: 'Depositors', url: '/dashboard/depositors', icon: Wallet01Icon },
  { title: 'Collections', url: '/dashboard/collections', icon: CollectionsBookmarkIcon, roles: ['admin', 'manager'] },
  { title: 'Reports', url: '/dashboard/reports', icon: Analytics01Icon, roles: ['admin', 'manager'] },
]

export const navProjects: NavProjectItem[] = [
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings01Icon,
  },
]
