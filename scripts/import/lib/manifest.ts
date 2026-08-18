import { readFile } from 'node:fs/promises'
import path from 'node:path'

export type DocKind = 'section' | 'page'
export type DocStatus = 'draft' | 'needs_review' | 'published'
export type DocOrigin = 'team' | 'course' | 'generated'

export interface ManifestNode {
  slug: string
  title: string
  kind: DocKind
  position: number
  status: DocStatus
  origin: DocOrigin
  difficulty?: number | null
  content_file: string | null
  note?: string
  children?: ManifestNode[]
}

export interface Manifest {
  note: string
  images_dir: string
  tree: ManifestNode[]
  dropped: { source: string; reason: string }[]
}

/** A manifest node flattened with its resolved ancestor slug path -- walked
 * depth-first, pre-order, so parents always appear before their children. */
export interface PlannedNode {
  node: ManifestNode
  parentSlugPath: string[]
  depth: number
}

export async function loadManifest(bundleDir: string): Promise<Manifest> {
  const raw = await readFile(path.join(bundleDir, 'manifest.json'), 'utf-8')
  return JSON.parse(raw) as Manifest
}

export function flattenTree(tree: ManifestNode[]): PlannedNode[] {
  const planned: PlannedNode[] = []

  function walk(nodes: ManifestNode[], parentSlugPath: string[], depth: number) {
    for (const node of nodes) {
      planned.push({ node, parentSlugPath, depth })
      if (node.children && node.children.length > 0) {
        walk(node.children, [...parentSlugPath, node.slug], depth + 1)
      }
    }
  }

  walk(tree, [], 0)
  return planned
}

export async function loadPageContent(bundleDir: string, contentFile: string): Promise<string> {
  return readFile(path.join(bundleDir, contentFile), 'utf-8')
}
