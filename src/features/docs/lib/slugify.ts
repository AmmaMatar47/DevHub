/** Matches doc_nodes_slug_kebab_case: lowercase letters, digits, and single
 * hyphens between groups -- no leading/trailing/doubled hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
