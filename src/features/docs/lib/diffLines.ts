export type DiffLineType = 'unchanged' | 'added' | 'removed'

export interface DiffLine {
  type: DiffLineType
  text: string
}

/**
 * Classic LCS-based line diff -- O(n*m) time and space, which is fine for
 * doc-sized content (tens to low hundreds of lines). A word-level diff or a
 * library like diff-match-patch would be overkill for reviewing prose/code
 * changes in a version history panel.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const n = a.length
  const m = b.length

  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))

  for (let i = n - 1; i >= 0; i--) {
    const row = lcs[i]
    const nextRow = lcs[i + 1]
    if (!row || !nextRow) continue

    for (let j = m - 1; j >= 0; j--) {
      const matches = a[i] === b[j]
      const diag = nextRow[j + 1] ?? 0
      const down = nextRow[j] ?? 0
      const right = row[j + 1] ?? 0
      row[j] = matches ? diag + 1 : Math.max(down, right)
    }
  }

  function lcsAt(i: number, j: number): number {
    return lcs[i]?.[j] ?? 0
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    const lineA = a[i]
    const lineB = b[j]
    if (lineA === undefined || lineB === undefined) break

    if (lineA === lineB) {
      result.push({ type: 'unchanged', text: lineA })
      i++
      j++
    } else if (lcsAt(i + 1, j) >= lcsAt(i, j + 1)) {
      result.push({ type: 'removed', text: lineA })
      i++
    } else {
      result.push({ type: 'added', text: lineB })
      j++
    }
  }
  while (i < n) {
    const lineA = a[i]
    if (lineA !== undefined) result.push({ type: 'removed', text: lineA })
    i++
  }
  while (j < m) {
    const lineB = b[j]
    if (lineB !== undefined) result.push({ type: 'added', text: lineB })
    j++
  }

  return result
}
