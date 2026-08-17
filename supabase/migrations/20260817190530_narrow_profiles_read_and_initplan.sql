-- Two fixes carried over from M2.1 review, landed together since both are
-- pure policy rewrites and M3's UI work depends on get_doc_tree() being
-- fast once real content volume shows up.

-- ---------------------------------------------------------------------------
-- 0.1 — Narrow the profiles read policy.
--
-- profiles_select_authenticated (using true) let a deactivated user read
-- their own row -- the right goal, so the client could explain why they
-- were signed out -- but "true" also let a deactivated ex-teammate
-- enumerate the full roster and everyone's role. Split into two permissive
-- policies for the same command, which Postgres ORs together: own row is
-- always readable regardless of is_enabled(), everyone else's only while
-- the caller is enabled. An active user still sees the whole roster
-- (profiles data isn't sensitive among active teammates); a deactivated
-- user sees only themselves.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_authenticated" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles_select_others_when_enabled" on public.profiles
  for select
  to authenticated
  using ((select private.is_enabled()));

-- ---------------------------------------------------------------------------
-- 0.2 — Force InitPlan evaluation in every policy.
--
-- STABLE guarantees a consistent result within a statement, not that
-- Postgres evaluates the function only once -- in RLS policies it commonly
-- re-evaluates per row. Wrapping each call in a scalar subquery hoists it
-- into an InitPlan the planner computes once per statement instead.
-- Verified via EXPLAIN ANALYZE on get_doc_tree(), see PR description.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update
  to authenticated
  using ((id = (select auth.uid()) or (select public.is_admin())) and (select private.is_enabled()))
  with check ((id = (select auth.uid()) or (select public.is_admin())) and (select private.is_enabled()));

drop policy if exists "doc_nodes_select" on public.doc_nodes;
create policy "doc_nodes_select" on public.doc_nodes
  for select
  to authenticated
  using (
    (select private.is_enabled())
    and ((select public.is_editor()) or (status = 'published' and archived_at is null))
  );

drop policy if exists "doc_nodes_insert_editor" on public.doc_nodes;
create policy "doc_nodes_insert_editor" on public.doc_nodes
  for insert
  to authenticated
  with check ((select private.is_enabled()) and (select public.is_editor()));

drop policy if exists "doc_nodes_update_editor" on public.doc_nodes;
create policy "doc_nodes_update_editor" on public.doc_nodes
  for update
  to authenticated
  using ((select private.is_enabled()) and (select public.is_editor()))
  with check ((select private.is_enabled()) and (select public.is_editor()));

drop policy if exists "doc_versions_select_editor" on public.doc_versions;
create policy "doc_versions_select_editor" on public.doc_versions
  for select
  to authenticated
  using ((select private.is_enabled()) and (select public.is_editor()));

drop policy if exists "tags_select_authenticated" on public.tags;
create policy "tags_select_authenticated" on public.tags
  for select to authenticated using ((select private.is_enabled()));

drop policy if exists "tags_insert_editor" on public.tags;
create policy "tags_insert_editor" on public.tags
  for insert to authenticated with check ((select private.is_enabled()) and (select public.is_editor()));

drop policy if exists "tags_update_editor" on public.tags;
create policy "tags_update_editor" on public.tags
  for update to authenticated
  using ((select private.is_enabled()) and (select public.is_editor()))
  with check ((select private.is_enabled()) and (select public.is_editor()));

drop policy if exists "tags_delete_editor" on public.tags;
create policy "tags_delete_editor" on public.tags
  for delete to authenticated using ((select private.is_enabled()) and (select public.is_editor()));

drop policy if exists "doc_tags_select_authenticated" on public.doc_tags;
create policy "doc_tags_select_authenticated" on public.doc_tags
  for select to authenticated using ((select private.is_enabled()));

drop policy if exists "doc_tags_insert_editor" on public.doc_tags;
create policy "doc_tags_insert_editor" on public.doc_tags
  for insert to authenticated with check ((select private.is_enabled()) and (select public.is_editor()));

drop policy if exists "doc_tags_delete_editor" on public.doc_tags;
create policy "doc_tags_delete_editor" on public.doc_tags
  for delete to authenticated using ((select private.is_enabled()) and (select public.is_editor()));
