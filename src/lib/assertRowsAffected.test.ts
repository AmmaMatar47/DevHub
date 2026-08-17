import { describe, expect, it } from 'vitest'
import { assertRowsAffected, ZeroRowMutationError } from './assertRowsAffected'

describe('assertRowsAffected', () => {
  it('returns the rows when the mutation actually affected something', async () => {
    const rows = await assertRowsAffected(
      Promise.resolve({ data: [{ id: '1' }], error: null }),
    )
    expect(rows).toEqual([{ id: '1' }])
  })

  it('throws ZeroRowMutationError when RLS silently filtered every row out', async () => {
    await expect(
      assertRowsAffected(Promise.resolve({ data: [], error: null })),
    ).rejects.toBeInstanceOf(ZeroRowMutationError)
  })

  it('throws ZeroRowMutationError when data is null', async () => {
    await expect(
      assertRowsAffected(Promise.resolve({ data: null, error: null })),
    ).rejects.toBeInstanceOf(ZeroRowMutationError)
  })

  it('uses the custom message when provided', async () => {
    await expect(
      assertRowsAffected(Promise.resolve({ data: [], error: null }), 'nope'),
    ).rejects.toThrow('nope')
  })

  it('surfaces a real Postgres error instead of the zero-row error', async () => {
    await expect(
      assertRowsAffected(Promise.resolve({ data: null, error: { message: 'connection lost' } })),
    ).rejects.toThrow('connection lost')
  })
})
