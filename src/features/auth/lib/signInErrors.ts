import { AuthError } from '@supabase/supabase-js'

/**
 * Supabase itself already returns the same generic error for a wrong email
 * and a wrong password ("Invalid login credentials") — nothing here needs
 * to special-case that. The distinction that matters is: did the request
 * reach the server and get rejected (an AuthError with a status), or did it
 * never get a response at all (a network failure)?
 */
export function getSignInErrorMessage(error: unknown): string {
  if (error instanceof AuthError && typeof error.status === 'number') {
    return 'Invalid email or password.'
  }
  return "Couldn't reach the server. Check your connection and try again."
}
