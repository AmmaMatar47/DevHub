-- RLS + trigger-guard verification suite. Run with `supabase test db` (once
-- local Docker dev is available) or `psql -f supabase/tests/rls.sql`
-- against a project with the migrations applied. pgtap is enabled by
-- 20260816210440_enable_pgtap.sql.
--
-- Everything runs inside one transaction that's rolled back at the end, so
-- the fixture users/nodes created here never persist.

begin;
select plan(58);

-- ---------------------------------------------------------------------------
-- Fixtures: one member, one editor, one admin; a published root, a draft
-- child, a needs_review child, and an archived (but published) child.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'rlstest-member@devhub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Test Member"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rlstest-editor@devhub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Test Editor"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'rlstest-admin@devhub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Test Admin"}', now(), now());

-- Runs here with no request context (direct SQL) -- exactly the
-- administrative path 20260817152009_privilege_guard_allowlist keeps open.
update public.profiles set role = 'editor' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, content_md)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', null, 'rls-test-root', 'RLS Test Root', 'section', 'published', null),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'rls-test-draft', 'RLS Test Draft', 'page', 'draft', 'secret draft content'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'rls-test-needs-review', 'RLS Test Needs Review', 'page', 'needs_review', 'secret review content'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000001', 'rls-test-archived', 'RLS Test Archived', 'page', 'published', 'secret archived content');

-- Archive it via direct SQL (no request context bypasses the archive
-- guard, same as the admin-only path would through the API).
update public.doc_nodes set archived_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000006';

-- M4a.1: one doc_images row on the published root, one on the draft child --
-- doc_images_select mirrors doc_nodes visibility exactly, so these piggyback
-- on the same published/draft distinction already set up above. One
-- doc_image_sweep_log row too (only ever written by the sweep edge
-- function's service_role connection, which bypasses RLS -- inserted here
-- directly for the same reason).
insert into public.doc_images (id, node_id, storage_path, full_path, width, height, byte_size)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'rls-test/published.webp', 'rls-test/published@full.webp', 10, 10, 100),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000002', 'rls-test/draft.webp', 'rls-test/draft@full.webp', 10, 10, 100);

insert into public.doc_image_sweep_log (doc_image_id, node_id, storage_path, full_path, byte_size, orphaned_at)
values ('bbbbbbbb-0000-0000-0000-000000000099', 'aaaaaaaa-0000-0000-0000-000000000001', 'rls-test/swept.webp', 'rls-test/swept@full.webp', 100, now());

create or replace function pg_temp.act_as(user_id uuid, role_claim text, pg_role text default 'authenticated')
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', pg_role, 'user_role', role_claim)::text,
    true
  );
  perform set_config('role', pg_role, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Member: read-only, sees only published/non-archived, cannot touch role,
-- is_active, or archived_at, cannot write anything.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'member');

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  0,
  'member cannot read a draft node'
);

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000005'),
  0,
  'member cannot read a needs_review node'
);

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000006'),
  0,
  'member cannot read an archived node'
);

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'member can read a published, non-archived node'
);

select lives_ok(
  $$ update public.doc_nodes set title = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'member update statement does not error (RLS silently matches zero rows)'
);

select is(
  (select title from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'RLS Test Root',
  'member update did not actually change the row (RLS blocked it)'
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001',
  'Only admins can change role',
  'member cannot promote themselves to admin'
);

select throws_ok(
  $$ update public.profiles set is_active = false where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001',
  'Only admins can change is_active',
  'member cannot deactivate their own account'
);

-- M4a.1: doc_images_select mirrors doc_nodes visibility -- a member sees
-- the published node's image, not the draft's -- and can never upload
-- (doc_images_insert_editor requires is_editor()).
select is(
  (select count(*)::int from public.doc_images where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  1,
  'member can read a doc_images row on a published node'
);

select is(
  (select count(*)::int from public.doc_images where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0,
  'member cannot read a doc_images row on a draft node'
);

select throws_ok(
  $$ insert into public.doc_images (node_id, storage_path, full_path, width, height, byte_size) values ('aaaaaaaa-0000-0000-0000-000000000001', 'rls-test/member-upload.webp', 'rls-test/member-upload@full.webp', 10, 10, 100) $$,
  '42501',
  'new row violates row-level security policy for table "doc_images"',
  'member cannot upload (insert) a doc_images row'
);

-- ---------------------------------------------------------------------------
-- Editor: sees drafts/needs_review, can write content, cannot archive,
-- cannot insert directly into doc_versions (trigger-only).
-- ---------------------------------------------------------------------------

select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'editor');

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  1,
  'editor can read a draft node'
);

select lives_ok(
  $$ update public.doc_nodes set title = 'Edited By Editor' where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  'editor can update a node'
);

select throws_ok(
  $$ update public.doc_nodes set archived_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'P0001',
  'Only admins can archive or unarchive a node',
  'editor cannot archive a node'
);

select throws_ok(
  $$ insert into public.doc_versions (node_id, title, content_md) values ('aaaaaaaa-0000-0000-0000-000000000001', 'forged version', 'x') $$,
  '42501',
  'new row violates row-level security policy for table "doc_versions"',
  'editor cannot insert directly into doc_versions (trigger-only)'
);

-- M4a.1: editor sees the draft's image too (doc_images_select ORs in
-- is_editor()), can upload, but doc_images_delete_admin means a delete
-- attempt is just silently filtered to zero rows -- same USING-clause
-- pattern as the member update test above, not an error.
select is(
  (select count(*)::int from public.doc_images where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  1,
  'editor can read a doc_images row on a draft node'
);

select lives_ok(
  $$ insert into public.doc_images (id, node_id, storage_path, full_path, width, height, byte_size) values ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', 'rls-test/editor-upload.webp', 'rls-test/editor-upload@full.webp', 10, 10, 100) $$,
  'editor can upload (insert) a doc_images row'
);

select lives_ok(
  $$ delete from public.doc_images where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'editor delete statement does not error (RLS silently matches zero rows)'
);

select is(
  (select count(*)::int from public.doc_images where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  1,
  'editor delete did not actually remove the row (RLS blocked it, admin-only)'
);

-- doc_image_sweep_log is an admin-only audit trail -- editors get nothing.
select is(
  (select count(*)::int from public.doc_image_sweep_log),
  0,
  'editor cannot read doc_image_sweep_log'
);

-- ---------------------------------------------------------------------------
-- Admin: can archive.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'admin');

select lives_ok(
  $$ update public.doc_nodes set archived_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'admin can archive a node'
);

select is(
  (select archived_at is not null from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  true,
  'archived_at was actually set'
);

-- M4a.1: admin is the only role that can actually delete a doc_images row,
-- and can read the sweep log the other personas above could not.
select lives_ok(
  $$ delete from public.doc_images where id = 'bbbbbbbb-0000-0000-0000-000000000001' $$,
  'admin can delete a doc_images row'
);

select is(
  (select count(*)::int from public.doc_images where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'admin delete actually removed the row'
);

select is(
  (select count(*)::int from public.doc_image_sweep_log),
  1,
  'admin can read doc_image_sweep_log'
);

-- ---------------------------------------------------------------------------
-- anon: no policy targets anon anywhere -- reads nothing at all, published
-- or not.
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
select set_config('role', 'anon', true);

select is(
  (select count(*)::int from public.doc_nodes),
  0,
  'anon reads zero doc_nodes rows, including published ones'
);

-- ---------------------------------------------------------------------------
-- service_role: a request arriving through PostgREST with role=service_role
-- must still trip the privilege-escalation guard. This is exactly the gap
-- the deny-list version (auth.role() = 'authenticated') would have missed,
-- since auth.role() would have returned 'service_role', not 'authenticated'.
-- ---------------------------------------------------------------------------

-- Reset the PG role from the anon block above so the row is reachable via
-- the profiles_update_own_or_admin policy (id = auth.uid()) and the
-- trigger actually fires -- this test targets the trigger's own
-- request-context check specifically, not RLS row-matching.
select set_config('role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'service_role')::text,
  true
);

select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001',
  'Only admins can change role',
  'a service_role request through PostgREST is still subject to the privilege guard'
);

-- Back to an unrestricted role before setting up the next fixture -- the
-- service_role block above left us running as 'authenticated', which can't
-- insert into auth.users/auth.sessions.
reset role;

-- ---------------------------------------------------------------------------
-- Deactivation: is_active isn't in the JWT at all -- is_enabled() checks it
-- live against profiles on every query -- so this must block a deactivated
-- user even though their JWT is still perfectly valid and still claims
-- user_role=editor. A dedicated node is used here rather than reusing root,
-- since root was archived by the admin block above.
--
-- The role/is_active changes below run as the admin persona (via
-- pg_temp.act_as) rather than as bare direct SQL. request.jwt.claims is a
-- custom GUC -- once set within a session it can't be returned to true
-- NULL (RESET brings it back to '', not NULL), so by this point in the
-- file it's permanently non-null from the service_role block above. That's
-- fine: acting as the admin is also the actually-realistic path for one
-- user managing another's role/is_active, and prevent_profile_privilege_
-- escalation permits it on its own terms (is_admin() = true).
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
  'rlstest-deactivated@devhub.test', crypt('not-a-real-password', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Test Deactivated"}', now(), now()
);

insert into public.doc_nodes (id, parent_id, slug, title, kind, status)
values ('aaaaaaaa-0000-0000-0000-000000000007', null, 'rls-test-deactivation', 'RLS Test Deactivation', 'page', 'published');

-- A session row to prove the revocation trigger fires on deactivation.
insert into auth.sessions (id, user_id, created_at, updated_at, not_after)
values (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', now(), now(), now() + interval '1 week');

select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'admin');
update public.profiles set role = 'editor' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set is_active = false where id = '44444444-4444-4444-4444-444444444444';

-- auth.sessions has no grants for `authenticated` at all (table-level, not
-- RLS) -- check it back under the unrestricted role, not the admin persona.
reset role;

select is(
  (select count(*)::int from auth.sessions where user_id = '44444444-4444-4444-4444-444444444444'),
  0,
  'deactivation removes the user''s auth.sessions rows'
);

select pg_temp.act_as('44444444-4444-4444-4444-444444444444', 'editor');

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000007'),
  0,
  'a deactivated user cannot read a published doc_node'
);

-- profiles_select_own / profiles_select_others_when_enabled (M3 Part 0.1):
-- own row stays readable even while deactivated -- otherwise the client
-- can't explain why the user was signed out -- but nobody else's row does.
select is(
  (select count(*)::int from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  1,
  'a deactivated user can still read their own profile row'
);

select is(
  (select count(*)::int from public.profiles where id != '44444444-4444-4444-4444-444444444444'),
  0,
  'a deactivated user cannot read anyone else''s profile row'
);

select lives_ok(
  $$ update public.doc_nodes set title = 'should not apply' where id = 'aaaaaaaa-0000-0000-0000-000000000007' $$,
  'deactivated user update statement does not error (RLS silently matches zero rows)'
);

-- Checked from an unrestricted viewpoint, not the deactivated user's own --
-- they can't read the row at all (previous assertion), so having them
-- check their own "did it change" would just read back NULL either way.
select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'admin');

select is(
  (select title from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000007'),
  'RLS Test Deactivation',
  'deactivated user update did not actually change the row'
);

select pg_temp.act_as('44444444-4444-4444-4444-444444444444', 'editor');

select throws_ok(
  $$ insert into public.doc_nodes (parent_id, slug, title, kind, status) values (null, 'rls-test-deactivated-insert', 'Should Not Insert', 'page', 'draft') $$,
  '42501',
  'new row violates row-level security policy for table "doc_nodes"',
  'a deactivated editor cannot insert a doc_node'
);

-- Reactivate as the admin (same reasoning as above), then re-check as the
-- same still-editor JWT.
select pg_temp.act_as('33333333-3333-3333-3333-333333333333', 'admin');
update public.profiles set is_active = true where id = '44444444-4444-4444-4444-444444444444';

select pg_temp.act_as('44444444-4444-4444-4444-444444444444', 'editor');

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000007'),
  1,
  'reactivating restores read access'
);

select lives_ok(
  $$ update public.doc_nodes set title = 'Reactivated Editor Works' where id = 'aaaaaaaa-0000-0000-0000-000000000007' $$,
  'reactivating restores write access'
);

-- ---------------------------------------------------------------------------
-- M4b Part 1/2: move_doc_node depth cascade, subtree-height cap, cycle
-- rejection, and reorder_doc_children position normalisation.
--
-- The M1 set_doc_node_depth trigger only ever recomputes the single row it
-- fires for (`for each row`, no cascade to children) -- fix_subtree_depth()
-- exists specifically to walk the moved node's subtree and fix the rest.
-- The cap check (new_parent_depth + 1 + subtree_height <= 3) has to look at
-- the *whole* moved subtree's height, not just the moved node's own new
-- depth, or a tall subtree could be dropped somewhere that pushes its
-- deepest descendant past depth 3 while the moved node itself looks fine.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'editor');

-- A -> B -> C (chain): A's subtree height is 2, B's is 1.
insert into public.doc_nodes (id, parent_id, slug, title, kind, status, position) values
  ('cccccccc-1111-0000-0000-000000000001', null, 'mb-a', 'MB A', 'section', 'published', 100),
  ('cccccccc-1111-0000-0000-000000000002', 'cccccccc-1111-0000-0000-000000000001', 'mb-b', 'MB B', 'section', 'published', 0),
  ('cccccccc-1111-0000-0000-000000000003', 'cccccccc-1111-0000-0000-000000000002', 'mb-c', 'MB C', 'page', 'published', 0),
  -- D -> E -> F: separate chain used purely as move targets at depth 0/1/2.
  ('cccccccc-1111-0000-0000-000000000004', null, 'mb-d', 'MB D', 'section', 'published', 101),
  ('cccccccc-1111-0000-0000-000000000005', 'cccccccc-1111-0000-0000-000000000004', 'mb-e', 'MB E', 'section', 'published', 0),
  ('cccccccc-1111-0000-0000-000000000006', 'cccccccc-1111-0000-0000-000000000005', 'mb-f', 'MB F', 'page', 'published', 0),
  -- G -> H: direct-cycle fixture.
  ('cccccccc-1111-0000-0000-000000000007', null, 'mb-g', 'MB G', 'section', 'published', 102),
  ('cccccccc-1111-0000-0000-000000000008', 'cccccccc-1111-0000-0000-000000000007', 'mb-h', 'MB H', 'section', 'published', 0),
  -- I -> J -> K: indirect-cycle fixture.
  ('cccccccc-1111-0000-0000-000000000009', null, 'mb-i', 'MB I', 'section', 'published', 103),
  ('cccccccc-1111-0000-0000-00000000000a', 'cccccccc-1111-0000-0000-000000000009', 'mb-j', 'MB J', 'section', 'published', 0),
  ('cccccccc-1111-0000-0000-00000000000b', 'cccccccc-1111-0000-0000-00000000000a', 'mb-k', 'MB K', 'page', 'published', 0),
  -- P with children Q/R/S at non-contiguous positions, for reorder_doc_children.
  ('cccccccc-1111-0000-0000-00000000000c', null, 'mb-p', 'MB P', 'section', 'published', 104),
  ('cccccccc-1111-0000-0000-00000000000d', 'cccccccc-1111-0000-0000-00000000000c', 'mb-q', 'MB Q', 'page', 'published', 50),
  ('cccccccc-1111-0000-0000-00000000000e', 'cccccccc-1111-0000-0000-00000000000c', 'mb-r', 'MB R', 'page', 'published', 5),
  ('cccccccc-1111-0000-0000-00000000000f', 'cccccccc-1111-0000-0000-00000000000c', 'mb-s', 'MB S', 'page', 'published', 20);

-- Moving A (subtree height 2) under D (depth 0): 0+1+2=3, exactly at the
-- cap -- allowed, and depth must cascade through the whole subtree, not
-- just A itself.
select move_doc_node('cccccccc-1111-0000-0000-000000000001', 'cccccccc-1111-0000-0000-000000000004', 0);

select is(
  (select depth from public.doc_nodes where id = 'cccccccc-1111-0000-0000-000000000001'),
  1::smallint,
  'move_doc_node: moved node A gets the correct new depth'
);
select is(
  (select depth from public.doc_nodes where id = 'cccccccc-1111-0000-0000-000000000002'),
  2::smallint,
  'move_doc_node: depth cascades to A''s child B, not just A itself'
);
select is(
  (select depth from public.doc_nodes where id = 'cccccccc-1111-0000-0000-000000000003'),
  3::smallint,
  'move_doc_node: depth cascades two levels down, to A''s grandchild C'
);

-- Moving B (subtree height 1, carries child C) under E (depth 1):
-- 1+1+1=3, exactly at the cap -- allowed even though B alone would look
-- shallow; the check is against B's subtree height, not B's own new depth.
select move_doc_node('cccccccc-1111-0000-0000-000000000002', 'cccccccc-1111-0000-0000-000000000005', 0);
select is(
  (select depth from public.doc_nodes where id = 'cccccccc-1111-0000-0000-000000000003'),
  3::smallint,
  'move_doc_node: subtree-height cap allows a move landing exactly at depth 3'
);

-- Moving B (subtree height 1) under F (depth 2): 2+1+1=4, one level past
-- the cap -- rejected, even though B's own new depth (3) would be legal in
-- isolation. This is the spec's own worked example.
select throws_ok(
  $$ select move_doc_node('cccccccc-1111-0000-0000-000000000002', 'cccccccc-1111-0000-0000-000000000006', 0) $$,
  'P0001',
  null,
  'move_doc_node rejects a move whose subtree height, not just the moved node''s own depth, would exceed the cap'
);

-- Direct cycle: G under its own child H.
select throws_ok(
  $$ select move_doc_node('cccccccc-1111-0000-0000-000000000007', 'cccccccc-1111-0000-0000-000000000008', 0) $$,
  'P0001',
  null,
  'move_doc_node rejects moving a node under its own direct child'
);

-- Indirect cycle: I under its own grandchild K, via move_doc_node. For any
-- indirect cycle the subtree-height cap check fires first and rejects the
-- move before the cycle-triggering UPDATE ever runs -- structurally
-- inevitable (moving a subtree of height >= 2 under something already 2+
-- levels inside that same subtree always overshoots depth 3) -- so
-- move_doc_node correctly rejects it, just via the cap's error path.
select throws_ok(
  $$ select move_doc_node('cccccccc-1111-0000-0000-000000000009', 'cccccccc-1111-0000-0000-00000000000b', 0) $$,
  'P0001',
  null,
  'move_doc_node rejects an indirect cycle (I under its own grandchild K)'
);

-- The prevent_doc_node_cycle trigger itself, isolated from move_doc_node's
-- cap check via a raw UPDATE (which has no cap logic at all) -- proves the
-- trigger independently catches indirect cycles, not just direct ones.
select throws_ok(
  $$ update public.doc_nodes set parent_id = 'cccccccc-1111-0000-0000-00000000000b' where id = 'cccccccc-1111-0000-0000-000000000009' $$,
  'P0001',
  'Cannot move node cccccccc-1111-0000-0000-000000000009 under its own descendant',
  'prevent_doc_node_cycle trigger itself rejects an indirect cycle independent of move_doc_node'
);

-- reorder_doc_children: Q/R/S start at positions 50/5/20 (arbitrary, as the
-- importer leaves them) -- reordering to [S, Q, R] must produce contiguous
-- 0/1/2 in exactly that order, not just "some" contiguous assignment.
select reorder_doc_children(
  'cccccccc-1111-0000-0000-00000000000c',
  array['cccccccc-1111-0000-0000-00000000000f', 'cccccccc-1111-0000-0000-00000000000d', 'cccccccc-1111-0000-0000-00000000000e']::uuid[]
);
select is(
  (select array_agg(slug order by position) from public.doc_nodes where parent_id = 'cccccccc-1111-0000-0000-00000000000c'),
  array['mb-s', 'mb-q', 'mb-r'],
  'reorder_doc_children rewrites positions to contiguous 0..n-1 in the given order'
);

-- ---------------------------------------------------------------------------
-- M4b Part 3: create_doc_node -- permission, depth cascade, the depth-3 cap
-- rejection (clear message, not a silent no-op), and sibling-slug uniqueness.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'editor');

-- A chain down to depth 3, to exercise the cap.
insert into public.doc_nodes (id, parent_id, slug, title, kind, status, position) values
  ('cccccccc-2222-0000-0000-000000000001', null, 'cn-root', 'CN Root', 'section', 'published', 200),
  ('cccccccc-2222-0000-0000-000000000002', 'cccccccc-2222-0000-0000-000000000001', 'cn-lvl1', 'CN Lvl1', 'section', 'published', 0),
  ('cccccccc-2222-0000-0000-000000000003', 'cccccccc-2222-0000-0000-000000000002', 'cn-lvl2', 'CN Lvl2', 'section', 'published', 0),
  ('cccccccc-2222-0000-0000-000000000004', 'cccccccc-2222-0000-0000-000000000003', 'cn-lvl3', 'CN Lvl3', 'page', 'published', 0);

select lives_ok(
  $$ select create_doc_node(null, 'New Root', 'new-root-cn', 'section') $$,
  'editor can create a new root section'
);
select is(
  (select json_build_object('depth', depth, 'status', status) from public.doc_nodes where slug = 'new-root-cn' and parent_id is null)::text,
  json_build_object('depth', 0, 'status', 'draft')::text,
  'new root: depth 0, starts draft'
);

with created as (select * from create_doc_node('cccccccc-2222-0000-0000-000000000001', 'New Child', 'new-child-cn', 'page'))
select is(
  (select depth from created),
  1::smallint,
  'child under a depth-0 parent gets depth 1'
);

select throws_ok(
  $$ select create_doc_node('cccccccc-2222-0000-0000-000000000004', 'Too Deep', 'too-deep-cn', 'page') $$,
  'P0001',
  null,
  'creating under a depth-3 node is rejected with a clear explanation, not silently'
);

select throws_ok(
  $$ select create_doc_node('cccccccc-2222-0000-0000-000000000001', 'Dup', 'cn-lvl1', 'page') $$,
  '23505',
  null,
  'duplicate sibling slug is rejected by the unique index'
);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'member');
select throws_ok(
  $$ select create_doc_node(null, 'Member Root', 'member-root-cn', 'section') $$,
  'P0001',
  'Only editors and admins can create pages',
  'member cannot create a node'
);

-- ---------------------------------------------------------------------------
-- M4b Part 4: get_move_targets -- the "Move to..." picker's data source.
-- subtree_height() is the single function both move_doc_node's cap check
-- and this picker call, so the two can never validate differently. Reuses
-- the exact fixture shape (A->B->C, D->E->F) already proven against
-- move_doc_node's own allow/reject cases above, so a mismatch here would
-- mean the picker and the move itself actually disagree.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('22222222-2222-2222-2222-222222222222', 'editor');

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, position) values
  ('eeeeeeee-1111-0000-0000-000000000001', null, 'gmt-a', 'GMT A', 'section', 'published', 300),
  ('eeeeeeee-1111-0000-0000-000000000002', 'eeeeeeee-1111-0000-0000-000000000001', 'gmt-b', 'GMT B', 'section', 'published', 0),
  ('eeeeeeee-1111-0000-0000-000000000003', 'eeeeeeee-1111-0000-0000-000000000002', 'gmt-c', 'GMT C', 'page', 'published', 0),
  ('eeeeeeee-1111-0000-0000-000000000004', null, 'gmt-d', 'GMT D', 'section', 'published', 301),
  ('eeeeeeee-1111-0000-0000-000000000005', 'eeeeeeee-1111-0000-0000-000000000004', 'gmt-e', 'GMT E', 'section', 'published', 0),
  ('eeeeeeee-1111-0000-0000-000000000006', 'eeeeeeee-1111-0000-0000-000000000005', 'gmt-f', 'GMT F', 'page', 'published', 0);

select is(
  (select count(*)::int from get_move_targets('eeeeeeee-1111-0000-0000-000000000001')
   where id in ('eeeeeeee-1111-0000-0000-000000000001','eeeeeeee-1111-0000-0000-000000000002','eeeeeeee-1111-0000-0000-000000000003')),
  0,
  'get_move_targets excludes the moved node''s own subtree entirely'
);
select is(
  (select is_valid from get_move_targets('eeeeeeee-1111-0000-0000-000000000001') where id = 'eeeeeeee-1111-0000-0000-000000000004'),
  true,
  'get_move_targets: D (depth0) is valid for A (subtree_height=2), exactly at cap'
);
select is(
  (select is_valid from get_move_targets('eeeeeeee-1111-0000-0000-000000000001') where id = 'eeeeeeee-1111-0000-0000-000000000005'),
  false,
  'get_move_targets: E (depth1) is invalid for A (subtree_height=2), one past cap'
);
select isnt(
  (select reason from get_move_targets('eeeeeeee-1111-0000-0000-000000000001') where id = 'eeeeeeee-1111-0000-0000-000000000005'),
  null,
  'get_move_targets: an invalid target carries a non-null reason'
);
select is(
  (select is_valid from get_move_targets('eeeeeeee-1111-0000-0000-000000000002') where id = 'eeeeeeee-1111-0000-0000-000000000006'),
  false,
  'get_move_targets: F (depth2) is invalid for B (subtree_height=1) -- agrees with move_doc_node''s own rejected case'
);
select is(
  (select is_valid from get_move_targets('eeeeeeee-1111-0000-0000-000000000002') where id = 'eeeeeeee-1111-0000-0000-000000000005'),
  true,
  'get_move_targets: E (depth1) is valid for B (subtree_height=1) -- agrees with move_doc_node''s own allowed case'
);

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'member');
select throws_ok(
  $$ select * from get_move_targets('eeeeeeee-1111-0000-0000-000000000001') $$,
  'P0001',
  'Only editors and admins can move nodes',
  'member cannot call get_move_targets'
);

select * from finish();
rollback;
