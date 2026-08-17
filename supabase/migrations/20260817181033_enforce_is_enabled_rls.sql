-- ANDs is_enabled() into every policy that grants read or write access
-- across doc_nodes, doc_versions, tags, and doc_tags, plus profiles writes.
--
-- profiles reads are deliberately left open to any authenticated user, not
-- gated by is_enabled(). Verified live (not assumed): gating the SELECT
-- policy with is_enabled() does NOT recurse -- SECURITY DEFINER's internal
-- lookup bypasses profiles' own RLS, exactly as designed -- but it does
-- block a deactivated user from reading their own row, which breaks the
-- client's ability to detect is_active = false and show a clear message.
-- profiles data isn't sensitive, so the tradeoff isn't worth it. Writes are
-- gated, and were verified the same way: no recursion, correctly blocks a
-- deactivated user's update while leaving an active user's update working.

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update
  to authenticated
  using ((id = auth.uid() or public.is_admin()) and public.is_enabled())
  with check ((id = auth.uid() or public.is_admin()) and public.is_enabled());

-- doc_nodes

drop policy if exists "doc_nodes_select" on public.doc_nodes;
create policy "doc_nodes_select" on public.doc_nodes
  for select
  to authenticated
  using (
    public.is_enabled()
    and (public.is_editor() or (status = 'published' and archived_at is null))
  );

drop policy if exists "doc_nodes_insert_editor" on public.doc_nodes;
create policy "doc_nodes_insert_editor" on public.doc_nodes
  for insert
  to authenticated
  with check (public.is_enabled() and public.is_editor());

drop policy if exists "doc_nodes_update_editor" on public.doc_nodes;
create policy "doc_nodes_update_editor" on public.doc_nodes
  for update
  to authenticated
  using (public.is_enabled() and public.is_editor())
  with check (public.is_enabled() and public.is_editor());

-- doc_versions (insert is trigger-only/SECURITY DEFINER since M2.1's
-- doc_versions_trigger_only_insert migration -- transitively protected,
-- since the trigger only ever fires from a doc_nodes update that is_enabled()
-- already gates above)

drop policy if exists "doc_versions_select_editor" on public.doc_versions;
create policy "doc_versions_select_editor" on public.doc_versions
  for select
  to authenticated
  using (public.is_enabled() and public.is_editor());

-- tags

drop policy if exists "tags_select_authenticated" on public.tags;
create policy "tags_select_authenticated" on public.tags
  for select to authenticated using (public.is_enabled());

drop policy if exists "tags_insert_editor" on public.tags;
create policy "tags_insert_editor" on public.tags
  for insert to authenticated with check (public.is_enabled() and public.is_editor());

drop policy if exists "tags_update_editor" on public.tags;
create policy "tags_update_editor" on public.tags
  for update to authenticated
  using (public.is_enabled() and public.is_editor())
  with check (public.is_enabled() and public.is_editor());

drop policy if exists "tags_delete_editor" on public.tags;
create policy "tags_delete_editor" on public.tags
  for delete to authenticated using (public.is_enabled() and public.is_editor());

-- doc_tags

drop policy if exists "doc_tags_select_authenticated" on public.doc_tags;
create policy "doc_tags_select_authenticated" on public.doc_tags
  for select to authenticated using (public.is_enabled());

drop policy if exists "doc_tags_insert_editor" on public.doc_tags;
create policy "doc_tags_insert_editor" on public.doc_tags
  for insert to authenticated with check (public.is_enabled() and public.is_editor());

drop policy if exists "doc_tags_delete_editor" on public.doc_tags;
create policy "doc_tags_delete_editor" on public.doc_tags
  for delete to authenticated using (public.is_enabled() and public.is_editor());
