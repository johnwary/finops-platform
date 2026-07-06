import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  plugins: [adminClient()],
})

export type Session = typeof authClient.$Infer.Session
export type Role = 'admin' | 'manager' | 'user'

const ROLES: readonly Role[] = ['admin', 'manager', 'user']

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}
