import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { isRole, type Role } from '@/lib/auth-client'
import { useSession } from '../hooks/useSession'

interface RequireRoleProps {
  role: Role | Role[]
  children: ReactNode
  fallback?: 'redirect' | 'hide'
}

export function RequireRole({ role, children, fallback = 'redirect' }: RequireRoleProps) {
  const { data, isPending } = useSession()
  const allowedRoles = Array.isArray(role) ? role : [role]
  const userRole = isRole(data?.user.role) ? data.user.role : undefined

  if (isPending) {
    return null
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return fallback === 'hide' ? null : <Navigate to="/dashboard" replace />
  }

  return children
}
