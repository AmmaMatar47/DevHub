const IMAGE_REF_PATTERN = /!\[[^\]]*\]\(image:([^)]+)\)/g

/**
 * Mirrors the server-side extract_image_paths() used by the orphan-sync
 * trigger (supabase/migrations/20260818194725_doc_images_orphan_sync_and_sweep.sql)
 * -- same pattern, same scheme. Order is first-appearance in the document,
 * which the lightbox (M4a.1 Part 4) uses as its navigation order.
 */
export function extractImagePaths(content: string): string[] {
  const paths: string[] = []
  const seen = new Set<string>()
  for (const match of content.matchAll(IMAGE_REF_PATTERN)) {
    const path = match[1]
    if (path && !seen.has(path)) {
      seen.add(path)
      paths.push(path)
    }
  }
  return paths
}
