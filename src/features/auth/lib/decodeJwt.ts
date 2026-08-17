function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Decodes a JWT's payload without verifying its signature — this only ever
 * runs client-side on our own already-trusted session token, purely to read
 * the `user_role` claim the custom access token hook stamps into it. Never
 * use this to validate a token from an untrusted source.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segment = token.split('.')[1]
  if (!segment) return null

  try {
    const json = base64UrlDecode(segment)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}
