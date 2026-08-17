import type { DocStatus } from './buildTree'

export interface LocalDraft {
  title: string
  content_md: string
  difficulty: number | null
  status: DocStatus
  /** The server `updated_at` this draft was based on, so a later save's
   * conflict check and the "server also changed" note on restore both have
   * something to compare against. */
  baseUpdatedAt: string
  /** When this draft was last written to localStorage -- crash-recovery
   * bookkeeping only, not compared against the server. */
  savedAt: string
}

function draftKey(nodeId: string): string {
  return `devhub:draft:${nodeId}`
}

export function readLocalDraft(nodeId: string): LocalDraft | null {
  const raw = localStorage.getItem(draftKey(nodeId))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'title' in parsed &&
      'content_md' in parsed &&
      'baseUpdatedAt' in parsed
    ) {
      return parsed as LocalDraft
    }
    return null
  } catch {
    return null
  }
}

export function writeLocalDraft(nodeId: string, draft: LocalDraft): void {
  localStorage.setItem(draftKey(nodeId), JSON.stringify(draft))
}

export function clearLocalDraft(nodeId: string): void {
  localStorage.removeItem(draftKey(nodeId))
}
