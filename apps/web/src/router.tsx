import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { RequireRole } from '@/features/auth/components/RequireRole'
import {
  BorrowerDetailPage,
  BorrowersListPage,
  CollectionsPage,
  DashboardPage,
  ForgotPasswordPage,
  InviteAcceptPage,
  LoanDetailPage,
  LoansListPage,
  LoginPage,
  ReportsPage,
  ResetPasswordPage,
  SettingsPage,
} from '@/route-pages'

function page(element: ReactNode) {
  return <Suspense fallback={null}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: page(<LoginPage />),
  },
  {
    path: '/invite/accept',
    element: page(<InviteAcceptPage />),
  },
  {
    path: '/forgot-password',
    element: page(<ForgotPasswordPage />),
  },
  {
    path: '/reset-password',
    element: page(<ResetPasswordPage />),
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
            element: page(<DashboardPage />),
          },
          {
            path: 'settings',
            element: page(
              <RequireRole role="admin">
                <SettingsPage />
              </RequireRole>,
            ),
          },
          {
            path: 'loans',
            element: page(<LoansListPage />),
          },
          {
            path: 'loans/:id',
            element: page(<LoanDetailPage />),
          },
          {
            path: 'borrowers',
            element: page(<BorrowersListPage />),
          },
          {
            path: 'borrowers/:id',
            element: page(<BorrowerDetailPage />),
          },
          {
            path: 'collections',
            element: page(
              <RequireRole role={['admin', 'manager']}>
                <CollectionsPage />
              </RequireRole>,
            ),
          },
          {
            path: 'reports',
            element: page(
              <RequireRole role={['admin', 'manager']}>
                <ReportsPage />
              </RequireRole>,
            ),
          },
        ],
      },
    ],
  },
])
