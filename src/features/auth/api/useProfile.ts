import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type Profile = Tables<'profiles'>

export function profileQueryKey(userId: string | undefined) {
  return ['profile', userId] as const
}

/** The caller's own profiles row — display_name, avatar_url, role, is_active. */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: async (): Promise<Profile> => {
      if (!userId) throw new Error('useProfile called without a userId')

      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

      if (error) throw error
      return data
    },
    enabled: userId !== undefined,
    // A row that changes maybe monthly doesn't need refetching on every
    // mount. The database enforces is_active/role via is_enabled() and the
    // JWT regardless of how stale this client copy gets, so the only cost
    // of a longer staleTime is a deactivated/role-changed user seeing stale
    // chrome for up to a minute while their actual queries already return
    // nothing/reflect the new role -- not a security tradeoff.
    staleTime: 60_000,
  })
}
