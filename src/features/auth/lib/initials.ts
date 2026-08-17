/** Two-letter initials from a display name, falling back to the email local-part. */
export function getInitials(displayName: string, email?: string): string {
  const source = displayName.trim() || email?.split('@')[0]?.trim() || ''
  if (!source) return '?'

  const words = source.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    const first = words[0]?.charAt(0) ?? ''
    const second = words[1]?.charAt(0) ?? ''
    return (first + second).toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}
