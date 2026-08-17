import { describe, expect, it } from 'vitest'
import { resolveAuthStatus } from './resolveAuthStatus'

describe('resolveAuthStatus', () => {
  it('is loading while the session is still being fetched, regardless of anything else', () => {
    expect(
      resolveAuthStatus({
        sessionLoading: true,
        hasSession: false,
        profileLoading: false,
        isActive: undefined,
      }),
    ).toBe('loading')
  })

  it('is unauthenticated once session loading finishes with no session', () => {
    expect(
      resolveAuthStatus({
        sessionLoading: false,
        hasSession: false,
        profileLoading: false,
        isActive: undefined,
      }),
    ).toBe('unauthenticated')
  })

  it('is loading while a session exists but the profile has not resolved yet', () => {
    expect(
      resolveAuthStatus({
        sessionLoading: false,
        hasSession: true,
        profileLoading: true,
        isActive: undefined,
      }),
    ).toBe('loading')

    expect(
      resolveAuthStatus({
        sessionLoading: false,
        hasSession: true,
        profileLoading: false,
        isActive: undefined,
      }),
    ).toBe('loading')
  })

  it('is authenticated once the session and an active profile have both resolved', () => {
    expect(
      resolveAuthStatus({
        sessionLoading: false,
        hasSession: true,
        profileLoading: false,
        isActive: true,
      }),
    ).toBe('authenticated')
  })

  it('is unauthenticated when the profile resolves but the account is deactivated', () => {
    expect(
      resolveAuthStatus({
        sessionLoading: false,
        hasSession: true,
        profileLoading: false,
        isActive: false,
      }),
    ).toBe('unauthenticated')
  })
})
