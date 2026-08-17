import type { Enums } from '@/types/database.types'

export type UserRole = Enums<'user_role'>

const ROLE_RANK: Record<UserRole, number> = {
  member: 0,
  editor: 1,
  admin: 2,
}

/** True when `role` meets or exceeds `minimum` in the member < editor < admin hierarchy. */
export function hasMinimumRole(role: UserRole | null | undefined, minimum: UserRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}
