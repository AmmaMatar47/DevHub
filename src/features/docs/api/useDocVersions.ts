import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type DocVersion = Tables<'doc_versions'> & {
  editor: Pick<Tables<'profiles'>, 'display_name'> | null
}

/** Newest first, via the (node_id, created_at DESC) index added in M1.1.
 * Editor/admin only -- doc_versions_select_editor already enforces that. */
export function useDocVersions(nodeId: string | undefined) {
  return useQuery({
    queryKey: ['doc-versions', nodeId],
    queryFn: async (): Promise<DocVersion[]> => {
      if (!nodeId) throw new Error('useDocVersions called without a nodeId')

      const { data, error } = await supabase
        .from('doc_versions')
        .select('*, editor:profiles!doc_versions_edited_by_fkey(display_name)')
        .eq('node_id', nodeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: nodeId !== undefined,
  })
}
