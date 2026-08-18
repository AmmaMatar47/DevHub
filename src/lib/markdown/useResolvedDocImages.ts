import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// The bucket is private (supabase/migrations/20260818194700_create_doc_images_storage_and_table.sql)
// -- reads only ever happen through short-lived signed URLs, never a public
// URL, and those URLs are resolved here rather than stored in content_md
// (which holds the stable `image:{storage_path}` reference instead, since a
// signed URL baked into markdown would eventually rot).
const SIGNED_URL_TTL_SECONDS = 60 * 60
// Refreshed well before the signed URL actually expires, so a page left
// open for a while never serves a dead link.
const STALE_TIME_MS = 45 * 60 * 1000

export interface ResolvedDocImage {
  altText: string | null
  width: number
  height: number
  displayUrl: string | null
  fullUrl: string | null
}

type ResolvedDocImageMap = Record<string, ResolvedDocImage>

/**
 * One batched lookup for every image referenced anywhere in a document --
 * a single doc_images row query plus two createSignedUrls calls (display
 * tier, full tier), regardless of how many images the document has. The
 * full-tier URL is resolved here too, not deferred to when the lightbox
 * opens, so opening it never issues a second round trip.
 */
export function useResolvedDocImages(paths: string[]) {
  const sortedPaths = [...paths].sort()

  return useQuery({
    queryKey: ['doc-images-resolved', sortedPaths],
    queryFn: async (): Promise<ResolvedDocImageMap> => {
      const { data: rows, error } = await supabase
        .from('doc_images')
        .select('storage_path, full_path, alt_text, width, height')
        .in('storage_path', sortedPaths)

      if (error) throw new Error(error.message)
      if (!rows || rows.length === 0) return {}

      const displayPaths = rows.map((row) => row.storage_path)
      const fullPaths = rows.map((row) => row.full_path)

      const [{ data: displaySigned }, { data: fullSigned }] = await Promise.all([
        supabase.storage.from('doc-images').createSignedUrls(displayPaths, SIGNED_URL_TTL_SECONDS),
        supabase.storage.from('doc-images').createSignedUrls(fullPaths, SIGNED_URL_TTL_SECONDS),
      ])

      const displayUrlByPath = new Map((displaySigned ?? []).map((signed) => [signed.path, signed.signedUrl]))
      const fullUrlByPath = new Map((fullSigned ?? []).map((signed) => [signed.path, signed.signedUrl]))

      const result: ResolvedDocImageMap = {}
      for (const row of rows) {
        result[row.storage_path] = {
          altText: row.alt_text,
          width: row.width,
          height: row.height,
          displayUrl: displayUrlByPath.get(row.storage_path) ?? null,
          fullUrl: fullUrlByPath.get(row.full_path) ?? null,
        }
      }
      return result
    },
    enabled: sortedPaths.length > 0,
    staleTime: STALE_TIME_MS,
  })
}
