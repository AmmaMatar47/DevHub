import { Outlet } from 'react-router-dom'
import { ForbiddenPage } from '@/shared/components/ForbiddenPage'
import { useAuth } from '../context/AuthContext'
import { hasMinimumRole, type UserRole } from '../lib/roles'

interface RequireRoleProps {
  minimumRole: UserRole
}

/**
 * Route guard for a minimum role, e.g. { element: <RequireRole minimumRole="editor" />, children: [...] }.
 * This is rendering-only, same as everything else client-side — the database's own
 * RLS policies are the actual security boundary and enforce this independently.
 */
export function RequireRole({ minimumRole }: RequireRoleProps) {
  const { role } = useAuth()

  if (!hasMinimumRole(role, minimumRole)) {
    return <ForbiddenPage />
  }

  return <Outlet />
}
