import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.types.ts'
import { flattenTree, loadManifest, loadPageContent, type DocOrigin, type DocStatus, type ManifestNode } from './lib/manifest.ts'
import { processImage } from './lib/imagePipeline.ts'

type Client = SupabaseClient<Database>

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUNDLE_DIR = path.join(__dirname, 'bundle')
const BUCKET = 'doc-images'
const IMAGE_REF_PATTERN = /!\[([^\]]*)\]\(images\/([^)]+)\)/g
const PLACEHOLDER_UNCREATED_ID = '00000000-0000-0000-0000-000000000000'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') })

const isDryRun = process.argv.includes('--dry-run')

function log(message: string) {
  console.log(message)
}

function fail(message: string): never {
  console.error(`\nERROR: ${message}`)
  process.exit(1)
}

// Same transform as useUploadDocImage.ts's deriveAltText -- applied to the
// bundle's original filename, so imported images get the same kind of
// caption a browser upload would have produced from that file.
function deriveAltText(fileName: string): string | null {
  const base = fileName.replace(/\.[^./\\]+$/, '').trim()
  const cleaned = base.replace(/[-_]+/g, ' ').trim()
  return cleaned.length > 0 ? cleaned : null
}

function storagePathFor(nodeId: string, imageFileName: string, ext: 'webp' | 'gif') {
  const base = imageFileName.replace(/\.[^./\\]+$/, '')
  return `${nodeId}/${base}.${ext}`
}

function fullPathFor(nodeId: string, imageFileName: string, ext: 'webp' | 'gif') {
  const base = imageFileName.replace(/\.[^./\\]+$/, '')
  return `${nodeId}/${base}@full.${ext}`
}

interface ImageRef {
  alt: string
  fileName: string
}

function extractImageRefs(content: string): ImageRef[] {
  const refs: ImageRef[] = []
  for (const match of content.matchAll(IMAGE_REF_PATTERN)) {
    const alt = match[1] ?? ''
    const fileName = match[2]
    if (fileName) refs.push({ alt, fileName })
  }
  return refs
}

interface ExistingNode {
  id: string
  title: string
  status: DocStatus
  origin: DocOrigin
  difficulty: number | null
  position: number
  content_md: string | null
}

async function findExisting(supabase: Client, slug: string, parentId: string | null): Promise<ExistingNode | null> {
  let query = supabase
    .from('doc_nodes')
    .select('id, title, status, origin, difficulty, position, content_md')
    .eq('slug', slug)
  query = parentId === null ? query.is('parent_id', null) : query.eq('parent_id', parentId)
  const { data, error } = await query.maybeSingle()
  if (error) fail(`Looking up "${slug}": ${error.message}`)
  return data
}

interface ImageOutcome {
  fileName: string
  storagePath: string
  /** Whether a doc_images row for this exact storage_path already existed
   * before this invocation -- true means nothing was (or, in dry-run,
   * would be) uploaded; idempotent re-runs see this true for every image. */
  alreadyExisted: boolean
  width: number
  height: number
  beforeBytes: number
  displayBytes: number
  fullBytes: number
  sameTier: boolean
}

/**
 * Plans (and, unless dryRun, executes) importing one referenced image for a
 * real node id. Read-only existence check always runs -- safe in dry-run,
 * and is what makes the dry-run report distinguish "would upload" from
 * "already present" -- the actual upload + doc_images insert only happens
 * when !dryRun and the row doesn't already exist.
 */
async function importOneImage(supabase: Client, nodeId: string, imageFileName: string, dryRun: boolean): Promise<ImageOutcome> {
  const filePath = path.join(BUNDLE_DIR, 'images', imageFileName)
  const original = await readFile(filePath)
  const processed = await processImage(original, imageFileName)
  const sameTier = processed.display === processed.full
  const storagePath = storagePathFor(nodeId, imageFileName, processed.displayExt)
  const finalFullPath = sameTier ? storagePath : fullPathFor(nodeId, imageFileName, processed.fullExt)

  const outcomeBase = {
    fileName: imageFileName,
    storagePath,
    width: processed.width,
    height: processed.height,
    beforeBytes: original.byteLength,
    displayBytes: processed.display.byteLength,
    fullBytes: processed.full.byteLength,
    sameTier,
  }

  const { data: existingRow, error: existingErr } = await supabase
    .from('doc_images')
    .select('id')
    .eq('storage_path', storagePath)
    .maybeSingle()
  if (existingErr) fail(`Checking doc_images for ${imageFileName}: ${existingErr.message}`)

  if (existingRow) {
    return { ...outcomeBase, alreadyExisted: true }
  }
  if (dryRun) {
    return { ...outcomeBase, alreadyExisted: false }
  }

  const contentType = processed.displayExt === 'gif' ? 'image/gif' : 'image/webp'

  const { error: displayUploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, processed.display, { contentType, upsert: true })
  if (displayUploadErr) fail(`Uploading ${storagePath}: ${displayUploadErr.message}`)

  if (!sameTier) {
    const { error: fullUploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(finalFullPath, processed.full, { contentType, upsert: true })
    if (fullUploadErr) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      fail(`Uploading ${finalFullPath}: ${fullUploadErr.message}`)
    }
  }

  const { error: insertErr } = await supabase.from('doc_images').insert({
    node_id: nodeId,
    storage_path: storagePath,
    full_path: finalFullPath,
    alt_text: deriveAltText(imageFileName),
    width: processed.width,
    height: processed.height,
    byte_size: processed.display.byteLength,
  })
  if (insertErr) {
    await supabase.storage.from(BUCKET).remove(sameTier ? [storagePath] : [storagePath, finalFullPath])
    fail(`Inserting doc_images row for ${imageFileName}: ${insertErr.message}`)
  }

  return { ...outcomeBase, alreadyExisted: false }
}

function formatImageLine(outcome: ImageOutcome): string {
  const verb = outcome.alreadyExisted ? 'already present, skipped' : isDryRun ? 'would upload' : 'uploaded'
  const tiers = outcome.sameTier
    ? `single tier (Part 0: already <=1400px) ${outcome.displayBytes}B`
    : `display ${outcome.displayBytes}B / full ${outcome.fullBytes}B`
  return `    - ${outcome.fileName}: ${verb} -- ${outcome.beforeBytes}B -> ${tiers}, ${outcome.width}x${outcome.height}`
}

/** Rewrites every `![alt](images/foo.png)` to `![alt](image:{storage_path})`.
 * The only content transformation this importer performs. Also runs (read-
 * only) in dry-run mode so the plan can report accurate image outcomes. */
async function planContent(
  supabase: Client,
  nodeId: string,
  rawContent: string,
  dryRun: boolean,
): Promise<{ content: string; outcomes: ImageOutcome[] }> {
  const refs = extractImageRefs(rawContent)
  let content = rawContent
  const outcomes: ImageOutcome[] = []

  for (const ref of refs) {
    const outcome = await importOneImage(supabase, nodeId, ref.fileName, dryRun)
    content = content.replaceAll(`(images/${ref.fileName})`, `(image:${outcome.storagePath})`)
    outcomes.push(outcome)
  }

  return { content, outcomes }
}

function diffFields(existing: ExistingNode, manifestNode: ManifestNode): string[] {
  const changes: string[] = []
  if (existing.title !== manifestNode.title) changes.push(`title: "${existing.title}" -> "${manifestNode.title}"`)
  if (existing.status !== manifestNode.status) changes.push(`status: ${existing.status} -> ${manifestNode.status}`)
  if (existing.origin !== manifestNode.origin) changes.push(`origin: ${existing.origin} -> ${manifestNode.origin}`)
  const manifestDifficulty = manifestNode.difficulty ?? null
  if (existing.difficulty !== manifestDifficulty) changes.push(`difficulty: ${existing.difficulty} -> ${manifestDifficulty}`)
  if (existing.position !== manifestNode.position) changes.push(`position: ${existing.position} -> ${manifestNode.position}`)
  return changes
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const adminEmail = process.env.IMPORT_ADMIN_EMAIL
  const adminPassword = process.env.IMPORT_ADMIN_PASSWORD

  if (!supabaseUrl || !supabaseAnonKey) fail('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local.')
  if (!adminEmail || !adminPassword) fail('Missing IMPORT_ADMIN_EMAIL / IMPORT_ADMIN_PASSWORD in .env.local.')

  // Deliberately the anon key + a real signed-in session, never the
  // service-role key -- RLS governs this import exactly as it governs the
  // app, so the import proves the permission model rather than bypassing it.
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

  log(`Signing in as ${adminEmail}...`)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  })
  if (authError || !authData.user) fail(`Sign-in failed: ${authError?.message ?? 'no user returned'}`)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', authData.user.id)
    .single()
  if (profileError) fail(`Reading own profile: ${profileError.message}`)
  if (profile.role !== 'admin') fail(`${adminEmail} is role "${profile.role}", not admin. Refusing to import.`)
  if (!profile.is_active) fail(`${adminEmail}'s account is deactivated.`)
  const adminId = profile.id
  log(`Signed in as admin (${adminId}).\n`)

  const manifest = await loadManifest(BUNDLE_DIR)
  const planned = flattenTree(manifest.tree)

  log(isDryRun ? '=== DRY RUN -- no writes will be made ===\n' : '=== Importing ===\n')

  const idBySlugPath = new Map<string, string>()
  let created = 0
  let updated = 0
  let unchanged = 0
  let imagesUploaded = 0
  let imagesSkipped = 0

  for (const { node, parentSlugPath, depth } of planned) {
    if (depth > 3) fail(`"${node.slug}" is at depth ${depth}, over the depth-4 (0..3) cap.`)

    const parentKey = parentSlugPath.join('/')
    const parentId = parentSlugPath.length === 0 ? null : (idBySlugPath.get(parentKey) ?? null)
    if (parentSlugPath.length > 0 && parentId === null) {
      fail(`Parent path "${parentKey}" for "${node.slug}" was not resolved -- manifest ordering bug.`)
    }

    const indent = '  '.repeat(depth)
    const nodeKey = [...parentSlugPath, node.slug].join('/')
    const existing = await findExisting(supabase, node.slug, parentId)

    if (!existing) {
      // --- CREATE ---
      created++
      log(`${indent}[CREATE] ${node.kind} "${node.title}" (${node.slug})`)

      if (isDryRun) {
        idBySlugPath.set(nodeKey, PLACEHOLDER_UNCREATED_ID)
        if (node.content_file) {
          const raw = await loadPageContent(BUNDLE_DIR, node.content_file)
          for (const ref of extractImageRefs(raw)) {
            log(`${indent}    - ${ref.fileName}: would upload (node not yet created)`)
            imagesUploaded++
          }
        }
        continue
      }

      const publishedAt = node.status === 'published' ? new Date().toISOString() : null
      const { data: inserted, error: insertErr } = await supabase
        .from('doc_nodes')
        .insert({
          parent_id: parentId,
          slug: node.slug,
          title: node.title,
          kind: node.kind,
          position: node.position,
          status: node.status,
          origin: node.origin,
          difficulty: node.difficulty ?? null,
          author_id: adminId,
          content_md: null,
          published_at: publishedAt,
        })
        .select('id')
        .single()
      if (insertErr || !inserted) fail(`Creating "${node.slug}": ${insertErr?.message}`)

      const nodeId = inserted.id
      idBySlugPath.set(nodeKey, nodeId)

      if (node.content_file) {
        const raw = await loadPageContent(BUNDLE_DIR, node.content_file)
        const { content, outcomes } = await planContent(supabase, nodeId, raw, false)
        for (const outcome of outcomes) {
          log(`${indent}${formatImageLine(outcome)}`)
          if (outcome.alreadyExisted) imagesSkipped++
          else imagesUploaded++
        }
        const { error: contentErr } = await supabase.from('doc_nodes').update({ content_md: content }).eq('id', nodeId)
        if (contentErr) fail(`Writing content for "${node.slug}": ${contentErr.message}`)
      }
      continue
    }

    // --- EXISTING: update or leave unchanged ---
    idBySlugPath.set(nodeKey, existing.id)

    let newContent: string | null = existing.content_md
    let imageOutcomes: ImageOutcome[] = []
    if (node.content_file) {
      const raw = await loadPageContent(BUNDLE_DIR, node.content_file)
      const result = await planContent(supabase, existing.id, raw, isDryRun)
      newContent = result.content
      imageOutcomes = result.outcomes
    }

    // newContent is computed from the deterministic storage paths above,
    // which don't depend on whether anything was actually uploaded -- so
    // this comparison is meaningful in dry-run too, not just on a real run.
    const fieldChanges = diffFields(existing, node)
    const contentChanged = node.content_file !== null && newContent !== existing.content_md
    const willChange = fieldChanges.length > 0 || contentChanged

    for (const outcome of imageOutcomes) {
      if (outcome.alreadyExisted) imagesSkipped++
      else imagesUploaded++
    }

    if (!willChange) {
      unchanged++
      log(`${indent}[UNCHANGED] ${node.kind} "${node.title}" (${node.slug})`)
      continue
    }

    updated++
    log(`${indent}[UPDATE] ${node.kind} "${node.title}" (${node.slug})`)
    for (const change of fieldChanges) log(`${indent}    ${change}`)
    if (contentChanged) log(`${indent}    content_md: replaced`)
    for (const outcome of imageOutcomes) log(`${indent}${formatImageLine(outcome)}`)

    if (isDryRun) continue

    const wasPublished = existing.status === 'published'
    const willBePublished = node.status === 'published'
    const payload: Database['public']['Tables']['doc_nodes']['Update'] = {
      title: node.title,
      kind: node.kind,
      position: node.position,
      status: node.status,
      origin: node.origin,
      difficulty: node.difficulty ?? null,
    }
    if (!wasPublished && willBePublished) payload.published_at = new Date().toISOString()
    if (node.content_file) payload.content_md = newContent

    const { error: updateErr } = await supabase.from('doc_nodes').update(payload).eq('id', existing.id)
    if (updateErr) fail(`Updating "${node.slug}": ${updateErr.message}`)
  }

  log('\n=== Summary ===')
  log(`Nodes: ${created} to create, ${updated} to update, ${unchanged} unchanged.`)
  log(`Images: ${imagesUploaded} ${isDryRun ? 'to upload' : 'uploaded'}, ${imagesSkipped} already present (skipped).`)
  log(isDryRun ? 'Dry run only -- nothing was written. Re-run without --dry-run to apply.' : 'Done.')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  fail(message)
})
