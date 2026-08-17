import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { buildTree, type DocTreeRow } from '../lib/buildTree'

export const docTreeQueryKey = ['doc-tree'] as const

/**
 * One RPC call returns the whole tree, respecting the caller's own RLS --
 * a member gets only published, non-archived rows; an editor/admin gets
 * everything. The nested structure is built client-side from the flat
 * rows (parent_id + position), never one request per level.
 *
 * The tree changes rarely (new pages, reordering), so staleTime is long.
 * Any future mutation should invalidate ['doc-tree'] explicitly.
 */
export function useDocTree() {
  return useQuery({
    queryKey: docTreeQueryKey,
    queryFn: async (): Promise<DocTreeRow[]> => {
      const { data, error } = await supabase.rpc('get_doc_tree')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
    select: buildTree,
  })
}
