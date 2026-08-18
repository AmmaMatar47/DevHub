-- Same class of issue as snapshot_doc_version in M1.1: any SECURITY
-- DEFINER function is exposed by PostgREST as a directly-callable RPC by
-- default. sync_doc_image_orphans is trigger-only and can't run outside
-- trigger context; sweep_orphaned_images is for the weekly pg_cron job
-- (or an admin running it by hand via SQL, not through the client API);
-- delete_doc_node_images is for M4b's node hard-delete to call from a
-- trusted server-side path, not something any authenticated user should
-- be able to invoke with an arbitrary node_id. Revoking from both the
-- specific roles and PUBLIC (the default grant every new function gets,
-- which anon/authenticated otherwise inherit through regardless of a
-- per-role revoke on top of it).
revoke execute on function public.sync_doc_image_orphans() from anon, authenticated, public;
revoke execute on function public.sweep_orphaned_images() from anon, authenticated, public;
revoke execute on function public.delete_doc_node_images(uuid) from anon, authenticated, public;

-- doc_image_sweep_log had no RLS at all -- only ever written by
-- sweep_orphaned_images (SECURITY DEFINER, bypasses RLS regardless), but
-- reads should still be gated rather than open to every authenticated
-- role via PostgREST. Admin-only: it's an internal audit trail, not
-- something editors need day to day.
alter table public.doc_image_sweep_log enable row level security;

create policy doc_image_sweep_log_select_admin on public.doc_image_sweep_log
for select to authenticated
using ((select private.is_enabled()) and (select is_admin()));
