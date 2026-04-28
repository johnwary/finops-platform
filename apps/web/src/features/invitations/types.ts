import type { Role } from '@/lib/auth-client'

export type { Role }
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'

export interface Invitation {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  token: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  invitedById: string
  invitedBy: {
    id: string
    name: string
    email: string
  }
}
