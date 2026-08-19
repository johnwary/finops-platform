import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { NotFound } from '@/components/layout/NotFound'
import { RouteError } from '@/components/layout/RouteError'
import { Spinner } from '@/components/ui/spinner'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { appRoutes, dashboardChildPath } from '@/lib/app-routes'
import {
  BorrowerDetailPage,
  BorrowersListPage,
  CollectionsPage,
  DashboardPage,
  DepositDetailPage,
  DepositorDetailPage,
  DepositorsListPage,
  DepositsListPage,
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
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      {element}
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: appRoutes.login.path,
        element: page(<LoginPage />),
      },
      {
        path: appRoutes.inviteAccept.path,
        element: page(<InviteAcceptPage />),
      },
      {
        path: appRoutes.forgotPassword.path,
        element: page(<ForgotPasswordPage />),
      },
      {
        path: appRoutes.resetPassword.path,
        element: page(<ResetPasswordPage />),
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: appRoutes.dashboard.path,
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
                path: dashboardChildPath(appRoutes.settings.path),
                element: page(
                  <RequireRole role={appRoutes.settings.roles!}>
                    <SettingsPage />
                  </RequireRole>,
                ),
              },
              {
                path: dashboardChildPath(appRoutes.loans.path),
                element: page(<LoansListPage />),
              },
              {
                path: dashboardChildPath(appRoutes.loanDetail.path),
                element: page(<LoanDetailPage />),
              },
              {
                path: dashboardChildPath(appRoutes.borrowers.path),
                element: page(<BorrowersListPage />),
              },
              {
                path: dashboardChildPath(appRoutes.borrowerDetail.path),
                element: page(<BorrowerDetailPage />),
              },
              {
                path: dashboardChildPath(appRoutes.deposits.path),
                element: page(<DepositsListPage />),
              },
              {
                path: dashboardChildPath(appRoutes.depositDetail.path),
                element: page(<DepositDetailPage />),
              },
              {
                path: dashboardChildPath(appRoutes.depositors.path),
                element: page(<DepositorsListPage />),
              },
              {
                path: dashboardChildPath(appRoutes.depositorDetail.path),
                element: page(<DepositorDetailPage />),
              },
              {
                path: dashboardChildPath(appRoutes.collections.path),
                element: page(
                  <RequireRole role={appRoutes.collections.roles!}>
                    <CollectionsPage />
                  </RequireRole>,
                ),
              },
              {
                path: dashboardChildPath(appRoutes.reports.path),
                element: page(
                  <RequireRole role={appRoutes.reports.roles!}>
                    <ReportsPage />
                  </RequireRole>,
                ),
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
