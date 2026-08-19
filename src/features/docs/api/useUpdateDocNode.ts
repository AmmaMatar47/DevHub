import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ZeroRowMutationError } from '@/lib/assertRowsAffected'
import type { Tables } from '@/types/database.types'

const SELECT_COLS = 'id, title, slug, content_md, difficulty, status, published_at, updated_at' as const

export type SavedDocNode = Pick<
  Tables<'doc_nodes'>,
  'id' | 'title' | 'slug' | 'content_md' | 'difficulty' | 'status' | 'published_at' | 'updated_at'
>

/**
 * A zero-row update here is ambiguous on its own: it could be a permission
 * failure (RLS's USING clause filtered it out) or a save conflict (someone
 * else's save already moved updated_at past what this edit was based on).
 * Distinguished by refetching: a different updated_at means a conflict
 * (this error, carrying the server's current row so the UI can show it
 * alongside the user's own changes); unreadable or unchanged means
 * permissions (ZeroRowMutationError, same as every other mutation).
 */
export class SaveConflictError extends Error {
  readonly serverRow: SavedDocNode

  constructor(serverRow: SavedDocNode) {
    super('Someone else saved changes to this page since you opened it.')
    this.name = 'SaveConflictError'
    this.serverRow = serverRow
  }
}

export interface SaveDocNodeInput {
  id: string
  title: string
  /** Not editable in this editor yet -- Part 5 (rename) owns slug edits and
   * their redirect history. Restore is the one path that changes this
   * today, since an old version's slug is part of what it means to restore
   * that version. */
  slug: string
  content_md: string
  difficulty: number | null
  status: Tables<'doc_nodes'>['status']
  /** Existing published_at, or a fresh timestamp the caller computes when
   * transitioning into 'published' for the first time. Republishing an
   * already-published node should pass its existing value through as-is. */
  publishedAt: string | null
  /** Captured when the editor loaded -- the optimistic-concurrency check. */
  loadedAt: string
}

async function saveDocNode(input: SaveDocNodeInput): Promise<SavedDocNode> {
  const { data, error } = await supabase
    .from('doc_nodes')
    .update({
      title: input.title,
      slug: input.slug,
      content_md: input.content_md,
      difficulty: input.difficulty,
      status: input.status,
      published_at: input.publishedAt,
    })
    .eq('id', input.id)
    .eq('updated_at', input.loadedAt)
    .select(SELECT_COLS)

  if (error) throw new Error(error.message)
  if (data && data.length > 0) {
    const [saved] = data
    if (saved) return saved
  }

  const { data: current } = await supabase.from('doc_nodes').select(SELECT_COLS).eq('id', input.id).maybeSingle()

  if (current && current.updated_at !== input.loadedAt) {
    throw new SaveConflictError(current)
  }
  throw new ZeroRowMutationError()
}

export function useUpdateDocNode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveDocNode,
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['doc-node', saved.id] })
    },
  })
}
