import { createClient } from 'npm:@supabase/supabase-js@2'

// Deleting from storage.objects can only happen through the Storage API --
// Supabase blocks direct SQL DELETE on that table (storage.protect_delete(),
// a BEFORE DELETE trigger) even for the service_role connection, which is
// why this sweep can't be a plain SQL function on a pg_cron schedule. It's
// invoked weekly instead via pg_cron + pg_net calling this function over
// HTTP (see the schedule_doc_image_sweep migration and its follow-up fix).
const BUCKET = 'doc-images'

interface SweepCandidate {
  id: string
  node_id: string
  storage_path: string
  full_path: string
  byte_size: number
  orphaned_at: string
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase service credentials.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // get_orphan_sweep_candidates() is SECURITY INVOKER -- this client's
  // service_role has bypassrls, so it sees every orphan project-wide, not
  // just ones scoped to some caller's own doc visibility.
  const { data: candidates, error: candidatesError } = await supabase.rpc('get_orphan_sweep_candidates')
  if (candidatesError) {
    return new Response(JSON.stringify({ error: candidatesError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const swept: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const image of (candidates ?? []) as SweepCandidate[]) {
    const paths =
      image.full_path === image.storage_path ? [image.storage_path] : [image.storage_path, image.full_path]

    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths)
    if (removeError) {
      failed.push({ id: image.id, error: removeError.message })
      continue
    }

    const { error: deleteError } = await supabase.from('doc_images').delete().eq('id', image.id)
    if (deleteError) {
      failed.push({ id: image.id, error: deleteError.message })
      continue
    }

    await supabase.from('doc_image_sweep_log').insert({
      doc_image_id: image.id,
      node_id: image.node_id,
      storage_path: image.storage_path,
      full_path: image.full_path,
      byte_size: image.byte_size,
      orphaned_at: image.orphaned_at,
    })

    swept.push(image.id)
  }

  return new Response(JSON.stringify({ swept: swept.length, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
