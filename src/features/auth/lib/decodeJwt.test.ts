import { describe, expect, it } from 'vitest'
import { decodeJwtPayload } from './decodeJwt'

function makeToken(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('decodeJwtPayload', () => {
  it('decodes a well-formed base64url payload', () => {
    const token = makeToken({ sub: 'user-1', user_role: 'editor' })
    expect(decodeJwtPayload(token)).toEqual({ sub: 'user-1', user_role: 'editor' })
  })

  it('handles payloads that need base64 padding', () => {
    // A payload whose base64url length isn't a multiple of 4 exercises the padding path.
    const token = makeToken({ a: 1 })
    expect(decodeJwtPayload(token)).toEqual({ a: 1 })
  })

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull()
    expect(decodeJwtPayload('')).toBeNull()
  })
})
