import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from './features/auth/components/LoginPage'
import { InviteAcceptPage } from './features/auth/components/InviteAcceptPage'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { RequireRole } from './features/auth/components/RequireRole'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { SettingsPage } from './features/settings/SettingsPage'

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
        element: <DashboardPage />,
      },
      {
        path: '/dashboard/settings',
        element: (
          <RequireRole role="admin">
            <SettingsPage />
          </RequireRole>
        ),
      },
    ],
  },
])
