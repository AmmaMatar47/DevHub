-- RLS + trigger-guard verification suite. Run with `supabase test db` (once
-- local Docker dev is available) or `psql -f supabase/tests/rls.sql`
-- against a project with the migrations applied. pgtap is enabled by
-- 20260816210440_enable_pgtap.sql.
--
-- Everything runs inside one transaction that's rolled back at the end, so
-- the fixture users/nodes created here never persist.

begin;
select plan(25);

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

select * from finish();
rollback;
