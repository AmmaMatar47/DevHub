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
  })
}
