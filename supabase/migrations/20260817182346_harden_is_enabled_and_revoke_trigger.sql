-- Security advisor, re-run after the migrations above per standing rule 3:
-- both new SECURITY DEFINER functions are directly RPC-callable by
-- anon/authenticated by default.
--
-- revoke_sessions_on_deactivation is trigger-only and never called from a
-- policy or app code -- same fix as handle_new_user/snapshot_doc_version:
-- straight revoke from PUBLIC and both roles explicitly.
--
-- is_enabled() is different: simply revoking EXECUTE would also break
-- every policy that calls it, since RLS policy evaluation runs as the
-- querying role and requires that role to actually hold EXECUTE on any
-- function the policy expression references -- SECURITY DEFINER only
-- changes the role *inside* the function body, not whether the caller may
-- invoke it at all. Verified empirically before landing this: revoking
-- authenticated's EXECUTE produced "permission denied for function
-- is_enabled" on every gated query. Moving it to a schema PostgREST
-- doesn't expose (only public/graphql_public are, per config.toml) closes
-- the direct-RPC path while leaving policy evaluation untouched --
-- authenticated still needs EXECUTE, it just no longer has a
-- /rest/v1/rpc/is_enabled endpoint to call it through.

revoke execute on function public.revoke_sessions_on_deactivation() from public, anon, authenticated;

create schema if not exists private;

alter function public.is_enabled() set schema private;

grant usage on schema private to authenticated;
grant execute on function private.is_enabled() to authenticated;
revoke execute on function private.is_enabled() from public, anon;

-- Every policy that referenced public.is_enabled() now points at
-- private.is_enabled() instead.

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update
  to authenticated
  using ((id = auth.uid() or public.is_admin()) and private.is_enabled())
  with check ((id = auth.uid() or public.is_admin()) and private.is_enabled());

drop policy if exists "doc_nodes_select" on public.doc_nodes;
create policy "doc_nodes_select" on public.doc_nodes
  for select
  to authenticated
  using (
    private.is_enabled()
    and (public.is_editor() or (status = 'published' and archived_at is null))
  );

drop policy if exists "doc_nodes_insert_editor" on public.doc_nodes;
create policy "doc_nodes_insert_editor" on public.doc_nodes
  for insert
  to authenticated
  with check (private.is_enabled() and public.is_editor());

drop policy if exists "doc_nodes_update_editor" on public.doc_nodes;
create policy "doc_nodes_update_editor" on public.doc_nodes
  for update
  to authenticated
  using (private.is_enabled() and public.is_editor())
  with check (private.is_enabled() and public.is_editor());

drop policy if exists "doc_versions_select_editor" on public.doc_versions;
create policy "doc_versions_select_editor" on public.doc_versions
  for select
  to authenticated
  using (private.is_enabled() and public.is_editor());

drop policy if exists "tags_select_authenticated" on public.tags;
create policy "tags_select_authenticated" on public.tags
  for select to authenticated using (private.is_enabled());

drop policy if exists "tags_insert_editor" on public.tags;
create policy "tags_insert_editor" on public.tags
  for insert to authenticated with check (private.is_enabled() and public.is_editor());

drop policy if exists "tags_update_editor" on public.tags;
create policy "tags_update_editor" on public.tags
  for update to authenticated
  using (private.is_enabled() and public.is_editor())
  with check (private.is_enabled() and public.is_editor());

drop policy if exists "tags_delete_editor" on public.tags;
create policy "tags_delete_editor" on public.tags
  for delete to authenticated using (private.is_enabled() and public.is_editor());

drop policy if exists "doc_tags_select_authenticated" on public.doc_tags;
create policy "doc_tags_select_authenticated" on public.doc_tags
  for select to authenticated using (private.is_enabled());

drop policy if exists "doc_tags_insert_editor" on public.doc_tags;
create policy "doc_tags_insert_editor" on public.doc_tags
  for insert to authenticated with check (private.is_enabled() and public.is_editor());

drop policy if exists "doc_tags_delete_editor" on public.doc_tags;
create policy "doc_tags_delete_editor" on public.doc_tags
  for delete to authenticated using (private.is_enabled() and public.is_editor());
