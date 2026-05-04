import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/components/LoginPage'
import { InviteAcceptPage } from '@/features/auth/components/InviteAcceptPage'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { BorrowerDetailPage } from '@/features/borrowers/BorrowerDetailPage'
import { BorrowersListPage } from '@/features/borrowers/BorrowersListPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LoanDetailPage } from '@/features/loans/LoanDetailPage'
import { LoansListPage } from '@/features/loans/LoansListPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/invite/accept',
    element: <InviteAcceptPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: (
          <AppShell>
            <Outlet />
          </AppShell>
        ),
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'settings',
            element: (
              <RequireRole role="admin">
                <SettingsPage />
              </RequireRole>
            ),
          },
          {
            path: 'loans',
            element: <LoansListPage />,
          },
          {
            path: 'loans/:id',
            element: <LoanDetailPage />,
          },
          {
            path: 'borrowers',
            element: <BorrowersListPage />,
          },
          {
            path: 'borrowers/:id',
            element: <BorrowerDetailPage />,
          },
        ],
      },
    ],
  },
])
