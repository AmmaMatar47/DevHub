import type { Database } from '@/types/database.types'

export type DocKind = Database['public']['Enums']['doc_kind']
export type DocStatus = Database['public']['Enums']['doc_status']

/**
 * The raw row shape get_doc_tree() returns. The generated type marks
 * parent_id as non-nullable `string`, but root nodes genuinely have
 * parent_id = null at runtime — the generator can't infer nullability
 * through a table-returning RPC function the way it does for real columns.
 */
export interface DocTreeRow {
  id: string
  parent_id: string | null
  slug: string
  title: string
  position: number
  depth: number
  kind: DocKind
  status: DocStatus
  path: string[]
}

export interface DocTreeNode {
  id: string
  parentId: string | null
  slug: string
  title: string
  position: number
  depth: number
  kind: DocKind
  status: DocStatus
  path: string[]
  children: DocTreeNode[]
}

/** Flat rows (any order) -> a nested tree, sorted by position at every level. */
export function buildTree(rows: DocTreeRow[]): DocTreeNode[] {
  const nodesById = new Map<string, DocTreeNode>()

  for (const row of rows) {
    nodesById.set(row.id, {
      id: row.id,
      parentId: row.parent_id,
      slug: row.slug,
      title: row.title,
      position: row.position,
      depth: row.depth,
      kind: row.kind,
      status: row.status,
      path: row.path,
      children: [],
    })
  }

  const roots: DocTreeNode[] = []

  for (const node of nodesById.values()) {
    const parent = node.parentId ? nodesById.get(node.parentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  sortByPosition(roots)
  return roots
}

function sortByPosition(nodes: DocTreeNode[]): void {
  nodes.sort((a, b) => a.position - b.position)
  for (const node of nodes) {
    sortByPosition(node.children)
  }
}

/** Depth-first flatten, preserving document order (parent, then each child in position order). */
export function flattenTree(nodes: DocTreeNode[]): DocTreeNode[] {
  const result: DocTreeNode[] = []
  const visit = (list: DocTreeNode[]) => {
    for (const node of list) {
      result.push(node)
      visit(node.children)
    }
  }
  visit(nodes)
  return result
}

/** Resolves a slug path (e.g. ['react', 'hooks', 'use-state']) to its node, if any. */
export function findNodeByPath(nodes: DocTreeNode[], segments: string[]): DocTreeNode | undefined {
  const target = segments.join('/')
  return flattenTree(nodes).find((node) => node.path.join('/') === target)
}

/**
 * The chain from root to `node`, inclusive — [React, Hooks, useState] for
 * a node at react/hooks/use-state. Used for breadcrumbs (needs each
 * ancestor's title, not just its slug) and the sidebar's auto-expand.
 */
export function getAncestorChain(nodes: DocTreeNode[], node: DocTreeNode): DocTreeNode[] {
  const flat = flattenTree(nodes)
  const chain: DocTreeNode[] = []
  for (let depth = 0; depth < node.path.length; depth++) {
    const prefix = node.path.slice(0, depth + 1).join('/')
    const ancestor = flat.find((candidate) => candidate.path.join('/') === prefix)
    if (ancestor) chain.push(ancestor)
  }
  return chain
}
