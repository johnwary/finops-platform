export interface ActivityLog {
  id: string
  action: string
  category: string
  actorType: string
  targetId: string | null
  metadata: unknown
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  } | null
}
