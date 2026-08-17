import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface SessionState {
  session: Session | null
  /** True until the initial getSession()/onAuthStateChange resolves. */
  isLoading: boolean
}

/**
 * The session source of truth. getSession() is asynchronous, so there's a
 * window where we don't yet know whether the user is signed in — isLoading
 * represents that third state explicitly so callers never mistake "still
 * checking" for "signed out".
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true })

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setState({ session, isLoading: false })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, isLoading: false })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}
