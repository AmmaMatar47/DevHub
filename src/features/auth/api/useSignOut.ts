import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Clears the entire TanStack Query cache regardless of whether the API call
 * itself succeeds — leaving another user's cached data behind on a shared
 * machine is a real leak, and a network failure shouldn't excuse it.
 */
export function useSignOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSettled: () => {
      queryClient.clear()
    },
  })
}
