import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type DocNode = Tables<'doc_nodes'> & {
  author: Pick<Tables<'profiles'>, 'display_name'> | null
  last_editor: Pick<Tables<'profiles'>, 'display_name'> | null
}

/**
 * A single node's full row, including content_md — deliberately separate
 * from useDocTree(). get_doc_tree() must never carry content, or loading
 * the sidebar means loading every page's markdown.
 */
export function useDocNode(nodeId: string | undefined) {
  return useQuery({
    queryKey: ['doc-node', nodeId],
    queryFn: async (): Promise<DocNode> => {
      if (!nodeId) throw new Error('useDocNode called without a nodeId')

      const { data, error } = await supabase
        .from('doc_nodes')
        .select('*, author:profiles!doc_nodes_author_id_fkey(display_name), last_editor:profiles!doc_nodes_last_edited_by_fkey(display_name)')
        .eq('id', nodeId)
        .single()

      if (error) throw error
      return data
    },
    enabled: nodeId !== undefined,
  })
}
