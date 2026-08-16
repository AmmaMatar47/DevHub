-- Row Level Security for every table. The anon key ships in the client
-- bundle, so RLS is the entire security model here -- there is no
-- server-side check behind it. Deny-by-default: every policy below targets
-- `authenticated` only, nothing is granted to `anon`, and any operation
-- without a matching policy is refused.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- The custom access token hook (auth.users trigger's SELECT) runs as
-- supabase_auth_admin, outside any user session -- it needs its own policy.
create policy "profiles_auth_admin_read" on public.profiles
  as permissive for select
  to supabase_auth_admin
  using (true);

create policy "profiles_select_authenticated" on public.profiles
  for select
  to authenticated
  using (true);

-- Row-level: a user may touch their own row, or an admin may touch any row.
-- Column-level (role/is_active staying admin-only) is enforced by the
-- profiles_prevent_privilege_escalation trigger from the profiles migration.
create policy "profiles_update_own_or_admin" on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No insert/delete policies: rows are created only by the handle_new_user
-- trigger (security definer, bypasses RLS) and are never deleted.

-- ---------------------------------------------------------------------------
-- doc_nodes
-- ---------------------------------------------------------------------------

alter table public.doc_nodes enable row level security;

-- Members see published, non-archived nodes. Editors/admins see everything,
-- including drafts and needs_review, so they can work on them.
create policy "doc_nodes_select" on public.doc_nodes
  for select
  to authenticated
  using (
    public.is_editor()
    or (status = 'published' and archived_at is null)
  );

create policy "doc_nodes_insert_editor" on public.doc_nodes
  for insert
  to authenticated
  with check (public.is_editor());

-- Row-level: editors and admins can update. Archiving specifically
-- (admin-only) is enforced by the doc_nodes_prevent_non_admin_archive
-- trigger from the doc_nodes migration.
create policy "doc_nodes_update_editor" on public.doc_nodes
  for update
  to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- No delete policy: nodes are soft-deleted via archived_at, never hard-deleted.

-- ---------------------------------------------------------------------------
-- doc_versions
-- ---------------------------------------------------------------------------

alter table public.doc_versions enable row level security;

create policy "doc_versions_select_editor" on public.doc_versions
  for select
  to authenticated
  using (public.is_editor());

-- Insert policy exists only so the doc_nodes_snapshot_version trigger (which
-- runs as the editing user, not security definer) is permitted to write.
-- Clients are not expected to insert here directly.
create policy "doc_versions_insert_editor" on public.doc_versions
  for insert
  to authenticated
  with check (public.is_editor());

-- No update/delete policy: history is immutable.

-- ---------------------------------------------------------------------------
-- tags / doc_tags
-- ---------------------------------------------------------------------------

alter table public.tags enable row level security;
alter table public.doc_tags enable row level security;

create policy "tags_select_authenticated" on public.tags
  for select to authenticated using (true);

create policy "tags_insert_editor" on public.tags
  for insert to authenticated with check (public.is_editor());

create policy "tags_update_editor" on public.tags
  for update to authenticated using (public.is_editor()) with check (public.is_editor());

create policy "tags_delete_editor" on public.tags
  for delete to authenticated using (public.is_editor());

create policy "doc_tags_select_authenticated" on public.doc_tags
  for select to authenticated using (true);

create policy "doc_tags_insert_editor" on public.doc_tags
  for insert to authenticated with check (public.is_editor());

create policy "doc_tags_delete_editor" on public.doc_tags
  for delete to authenticated using (public.is_editor());
