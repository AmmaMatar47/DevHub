import { describe, expect, it } from 'vitest'
import { hasMinimumRole } from './roles'

describe('hasMinimumRole', () => {
  it('allows a role to meet its own minimum', () => {
    expect(hasMinimumRole('member', 'member')).toBe(true)
    expect(hasMinimumRole('editor', 'editor')).toBe(true)
    expect(hasMinimumRole('admin', 'admin')).toBe(true)
  })

  it('allows a higher role to satisfy a lower minimum', () => {
    expect(hasMinimumRole('editor', 'member')).toBe(true)
    expect(hasMinimumRole('admin', 'member')).toBe(true)
    expect(hasMinimumRole('admin', 'editor')).toBe(true)
  })

  it('rejects a lower role against a higher minimum', () => {
    expect(hasMinimumRole('member', 'editor')).toBe(false)
    expect(hasMinimumRole('member', 'admin')).toBe(false)
    expect(hasMinimumRole('editor', 'admin')).toBe(false)
  })

  it('rejects when there is no role', () => {
    expect(hasMinimumRole(null, 'member')).toBe(false)
    expect(hasMinimumRole(undefined, 'member')).toBe(false)
  })
})
