import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { docTreeQueryKey } from './useDocTree'

export interface MoveDocNodeInput {
  nodeId: string
  /** null moves the node to the root level. */
  newParentId: string | null
  newPosition: number
}

async function moveDocNode(input: MoveDocNodeInput): Promise<void> {
  const { error } = await supabase.rpc('move_doc_node', {
    p_node_id: input.nodeId,
    // See useCreateDocNode's identical note -- the generator can't infer
    // nullability through a function argument; a root move really is null.
    p_new_parent_id: input.newParentId as string,
    p_new_position: input.newPosition,
  })
  if (error) throw new Error(error.message)
}

/** move_doc_node is the single transactional entry point (permission,
 * cycle rejection via the existing trigger, subtree depth cascade, subtree-
 * height cap, position normalisation of both the old and new parent) --
 * this hook is just the client-side wrapper + cache invalidation. */
export function useMoveDocNode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: moveDocNode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docTreeQueryKey })
    },
  })
}
