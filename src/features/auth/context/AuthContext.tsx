import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useSession } from '../api/useSession'
import { useProfile, type Profile } from '../api/useProfile'
import { useSignOut } from '../api/useSignOut'
import { resolveAuthStatus, type AuthStatus } from '../lib/resolveAuthStatus'
import { decodeJwtPayload } from '../lib/decodeJwt'
import type { UserRole } from '../lib/roles'

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  profile: Profile | null
  /** From profiles.role — current, used for rendering. */
  role: UserRole | null
  /**
   * True when profiles.role and the JWT's user_role claim disagree after one
   * refreshSession() attempt already failed to reconcile them. The JWT is
   * what RLS actually enforces, so a mismatch means the UI may be implying
   * permissions the database will refuse.
   */
  roleMismatch: boolean
  dismissRoleMismatch: () => void
  /**
   * Set once, right before the deactivation-triggered sign-out, so the login
   * page can explain why the user landed back there. RequireAuth is what
   * actually does the redirect (status simply becomes 'unauthenticated');
   * this only carries the reason. Consume-once: LoginPage reads it and
   * calls dismissDeactivatedNotice so a later, unrelated redirect to /login
   * doesn't show a stale message.
   */
  deactivatedNotice: boolean
  dismissDeactivatedNotice: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const { session, isLoading: sessionLoading } = useSession()
  const userId = session?.user.id
  const profileQuery = useProfile(userId)
  const signOut = useSignOut()

  const profile = profileQuery.data ?? null
  const isActive = profile?.is_active

  const status = resolveAuthStatus({
    sessionLoading,
    hasSession: session !== null,
    profileLoading: profileQuery.isLoading,
    isActive,
  })

  // is_active is a deactivation. Checked here so it applies uniformly on
  // bootstrap (a stale-but-valid session for an account deactivated since
  // last visit) and on any later refetch, not only at sign-in time.
  // RequireAuth handles the actual redirect once status flips to
  // 'unauthenticated' -- this just signs out and records why.
  const [deactivatedNotice, setDeactivatedNotice] = useState(false)

  useEffect(() => {
    if (profile && !profile.is_active) {
      // Paired with the signOut side effect below, which has to run in an
      // effect regardless -- recording why alongside it is the natural place.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeactivatedNotice(true)
      void signOut.mutateAsync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.is_active])

  // Role reconciliation: profiles.role can be ahead of the JWT's user_role
  // claim, since a role change doesn't reach the token until it refreshes.
  // One refresh attempt to catch up; if that doesn't resolve it, surface a
  // non-blocking notice instead of retrying forever.
  const jwtRole = session ? ((decodeJwtPayload(session.access_token)?.user_role as UserRole | undefined) ?? null) : null
  const profileRole = profile?.role ?? null
  const attemptedRefresh = useRef(false)
  const [roleMismatch, setRoleMismatch] = useState(false)

  useEffect(() => {
    if (!profileRole || !jwtRole) return

    if (profileRole === jwtRole) {
      attemptedRefresh.current = false
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the notice once the source values agree again
      setRoleMismatch(false)
      return
    }

    if (!attemptedRefresh.current) {
      attemptedRefresh.current = true
      void supabase.auth.refreshSession()
    } else {
      setRoleMismatch(true)
    }
  }, [profileRole, jwtRole])

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        profile,
        role: profileRole,
        roleMismatch,
        dismissRoleMismatch: () => setRoleMismatch(false),
        deactivatedNotice,
        dismissDeactivatedNotice: () => setDeactivatedNotice(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
