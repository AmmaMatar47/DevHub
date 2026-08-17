export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface ResolveAuthStatusInput {
  /** True until the initial supabase.auth.getSession()/onAuthStateChange resolves. */
  sessionLoading: boolean
  hasSession: boolean
  /** True while the profiles row for the current session is being fetched. */
  profileLoading: boolean
  /** undefined = profile not loaded yet. */
  isActive: boolean | undefined
}

/**
 * The single source of truth for the app's auth status. Session loading and
 * profile loading are two separate async steps with a gap between them —
 * collapsing that gap into "unauthenticated" is what causes a login-page
 * flash on every reload of an already-signed-in session.
 */
export function resolveAuthStatus({
  sessionLoading,
  hasSession,
  profileLoading,
  isActive,
}: ResolveAuthStatusInput): AuthStatus {
  if (sessionLoading) return 'loading'
  if (!hasSession) return 'unauthenticated'
  if (profileLoading || isActive === undefined) return 'loading'
  return isActive ? 'authenticated' : 'unauthenticated'
}
