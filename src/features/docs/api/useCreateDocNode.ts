import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'
import { docTreeQueryKey } from './useDocTree'

export interface CreateDocNodeInput {
  parentId: string | null
  title: string
  slug: string
  kind: Tables<'doc_nodes'>['kind']
}

export class DuplicateSlugError extends Error {
  constructor() {
    super('A sibling page already uses this slug.')
    this.name = 'DuplicateSlugError'
  }
}

export class InvalidSlugError extends Error {
  constructor() {
    super('Slugs can only contain lowercase letters, numbers, and hyphens, with no leading, trailing, or doubled hyphens.')
    this.name = 'InvalidSlugError'
  }
}

async function createDocNode(input: CreateDocNodeInput): Promise<Tables<'doc_nodes'>> {
  const { data, error } = await supabase.rpc('create_doc_node', {
    // The generator marks p_parent_id as non-nullable `string` -- it can't
    // infer nullability through a function argument the way it does for
    // real columns (same limitation noted on DocTreeRow in buildTree.ts).
    // A root node's parent really is null at the SQL level.
    p_parent_id: input.parentId as string,
    p_title: input.title,
    p_slug: input.slug,
    p_kind: input.kind,
  })
  if (error) {
    if (error.code === '23505') throw new DuplicateSlugError()
    if (error.code === '23514') throw new InvalidSlugError()
    throw new Error(error.message)
  }
  return data
}

/** create_doc_node is the single transactional entry point (permission,
 * depth-cap rejection, last-position assignment, insert) -- this hook is
 * just the client-side wrapper + cache invalidation, same shape as every
 * other doc_nodes mutation hook. */
export function useCreateDocNode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDocNode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docTreeQueryKey })
    },
  })
}
