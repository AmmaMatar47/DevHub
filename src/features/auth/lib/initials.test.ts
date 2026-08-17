import { describe, expect, it } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('takes the first letter of the first two words of a display name', () => {
    expect(getInitials('Jane Tan')).toBe('JT')
    expect(getInitials('Sara Osei Mensah')).toBe('SO')
  })

  it('takes the first two characters of a single-word display name', () => {
    expect(getInitials('raedamar52')).toBe('RA')
  })

  it('falls back to the email local-part when display name is blank', () => {
    expect(getInitials('', 'someone@example.com')).toBe('SO')
    expect(getInitials('   ', 'jane.tan@example.com')).toBe('JA')
  })

  it('falls back to "?" when there is nothing to work with', () => {
    expect(getInitials('')).toBe('?')
  })
})
