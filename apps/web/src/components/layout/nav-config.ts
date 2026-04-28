import {
  Analytics01Icon,
  BankIcon,
  CreditCardIcon,
  DashboardCircleIcon,
  Settings01Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons'

import type { NavMainItem } from '@/components/layout/NavMain'
import type { NavProjectItem } from '@/components/layout/NavProjects'

export const navMain: NavMainItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: DashboardCircleIcon, end: true },
  { title: 'Loans', url: '/dashboard/loans', icon: CreditCardIcon },
  { title: 'Borrowers', url: '/dashboard/borrowers', icon: UserMultiple02Icon },
  { title: 'Deposits', url: '/dashboard/deposits', icon: BankIcon },
  { title: 'Reports', url: '/dashboard/reports', icon: Analytics01Icon },
]

export const navProjects: NavProjectItem[] = [
  {
    title: 'Settings',
    url: '/dashboard/settings',
    icon: Settings01Icon,
    adminOnly: true,
  },
]
