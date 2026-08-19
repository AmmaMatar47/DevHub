import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DocKind } from '../lib/buildTree'

export interface MoveTarget {
  id: string
  parentId: string | null
  slug: string
  title: string
  kind: DocKind
  depth: number
  path: string[]
  isValid: boolean
  reason: string | null
}

/** The whole tree minus the moved node's own subtree, each candidate
 * flagged valid/invalid by the DB's get_move_targets -- the same
 * subtree_height() the move itself validates against, never a client-side
 * reimplementation of the depth-cap arithmetic (that's how the two would
 * end up drifting apart). */
export function useMoveTargets(nodeId: string | undefined) {
  return useQuery({
    queryKey: ['doc-move-targets', nodeId],
    queryFn: async (): Promise<MoveTarget[]> => {
      if (!nodeId) throw new Error('useMoveTargets called without a nodeId')

      const { data, error } = await supabase.rpc('get_move_targets', { p_node_id: nodeId })
      if (error) throw error

      return data.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        slug: row.slug,
        title: row.title,
        kind: row.kind,
        depth: row.depth,
        path: row.path,
        isValid: row.is_valid,
        reason: row.reason,
      }))
    },
    enabled: nodeId !== undefined,
  })
}
