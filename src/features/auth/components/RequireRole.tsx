import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { ForbiddenPage } from '@/shared/components/ForbiddenPage'
import { useAuth } from '../context/AuthContext'
import { hasMinimumRole, type UserRole } from '../lib/roles'

interface RequireRoleProps {
  minimumRole: UserRole
  /**
   * Optional: renders these instead of <Outlet /> on success. For gating a
   * route tree, e.g. { element: <RequireRole minimumRole="editor" />, children: [...] }.
   * For gating a component inline (e.g. a splat route that resolves its own
   * sub-path in JS, like the docs edit route -- react-router requires `*` to
   * be the last path segment, so that can't be a literal nested route), pass
   * children instead: <RequireRole minimumRole="editor"><EditView /></RequireRole>.
   */
  children?: ReactNode
}

/**
 * Guard for a minimum role. This is rendering-only, same as everything else
 * client-side — the database's own RLS policies are the actual security
 * boundary and enforce this independently.
 */
export function RequireRole({ minimumRole, children }: RequireRoleProps) {
  const { role } = useAuth()

  if (!hasMinimumRole(role, minimumRole)) {
    return <ForbiddenPage />
  }

  return children ?? <Outlet />
}
