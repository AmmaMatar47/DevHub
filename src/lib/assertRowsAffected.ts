/**
 * Postgres reports success with zero rows affected when RLS's USING clause
 * filters an UPDATE or DELETE down to nothing — the request "succeeds" and
 * changes nothing. To a client that looks identical to a real update, so a
 * member editing something they lack permission for would see it appear to
 * work. Every mutation must go through this rather than trusting `error`
 * alone: pass a query with `.select()` chained (so `data` reflects the rows
 * actually touched) and this throws when that array comes back empty.
 */

export class ZeroRowMutationError extends Error {
  constructor(message = 'This action had no effect. You may not have permission to do this.') {
    super(message)
    this.name = 'ZeroRowMutationError'
  }
}

interface MutationResult<T> {
  data: T[] | null
  error: { message: string } | null
}

export async function assertRowsAffected<T>(
  query: PromiseLike<MutationResult<T>>,
  message?: string,
): Promise<T[]> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new ZeroRowMutationError(message)
  return data
}
