import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { docTreeQueryKey } from './useDocTree'

export interface ReorderDocChildrenInput {
  /** null reorders the root-level siblings. */
  parentId: string | null
  orderedIds: string[]
}

async function reorderDocChildren(input: ReorderDocChildrenInput): Promise<void> {
  const { error } = await supabase.rpc('reorder_doc_children', {
    // See useCreateDocNode's identical note on p_parent_id nullability.
    p_parent_id: input.parentId as string,
    p_ordered_ids: input.orderedIds,
  })
  if (error) throw new Error(error.message)
}

/** Used both for the sibling "Move up"/"Move down" affordances (swap two
 * adjacent ids in the current order) and internally by move_doc_node --
 * reorder_doc_children itself is the single source of "what contiguous
 * position does each sibling get." */
export function useReorderDocChildren() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reorderDocChildren,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docTreeQueryKey })
    },
  })
}
