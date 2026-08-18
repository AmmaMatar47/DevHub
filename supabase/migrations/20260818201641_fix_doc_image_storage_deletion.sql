-- Both sweep_orphaned_images() and delete_doc_node_images() tried to
-- `delete from storage.objects` directly. Supabase blocks that
-- unconditionally via storage.protect_delete() (a BEFORE DELETE trigger
-- that raises regardless of role, including service_role) -- only the
-- Storage API can actually remove an object. Replacing both with
-- SECURITY INVOKER read-only functions that return what needs deleting;
-- the actual storage.remove() calls now live in the sweep-orphaned-images
-- edge function (weekly sweep) and will live in whatever M4b's node
-- hard-delete flow turns out to be (not built yet).

drop function if exists public.sweep_orphaned_images();
drop function if exists public.delete_doc_node_images(uuid);

-- No SECURITY DEFINER needed: service_role already has bypassrls (skips
-- RLS regardless of function security context), and for any other caller,
-- SECURITY INVOKER means this only ever returns orphan candidates for docs
-- that caller's own RLS already lets them see -- no new exposure.
create or replace function public.get_orphan_sweep_candidates()
returns setof public.doc_images
language sql
stable
set search_path = public
as $$
  select di.*
  from public.doc_images di
  where di.orphaned_at is not null
    and di.orphaned_at < now() - interval '30 days'
    and not exists (
      select 1 from public.doc_versions dv
      where dv.node_id = di.node_id
        and dv.content_md like '%' || di.storage_path || '%'
    );
$$;

comment on function public.get_orphan_sweep_candidates() is
  'Read-only. Called by the sweep-orphaned-images edge function (service_role, bypasses RLS -- sees every orphan project-wide) on a weekly pg_cron schedule. Does not delete anything itself.';

-- Ready for M4b's node hard-delete: capture these paths BEFORE deleting the
-- node row (doc_images.node_id cascades, so the rows vanish with the node),
-- then call the Storage API with them, then delete the node.
create or replace function public.get_doc_node_image_paths(target_node_id uuid)
returns table (storage_path text, full_path text)
language sql
stable
set search_path = public
as $$
  select di.storage_path, di.full_path
  from public.doc_images di
  where di.node_id = target_node_id;
$$;

comment on function public.get_doc_node_image_paths(uuid) is
  'Read-only path lookup for M4b''s future node hard-delete -- not called anywhere yet. Caller must capture these paths, delete via the Storage API, and only then delete the node row (doc_images cascades away with it).';
