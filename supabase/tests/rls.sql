-- RLS + trigger-guard verification suite. Run with `supabase test db` (once
-- local Docker dev is available) or `psql -f supabase/tests/rls.sql`
-- against a project with the migrations applied.
--
-- Everything runs inside one transaction that's rolled back at the end, so
-- the fixture users/nodes created here never persist.

begin;
select plan(10);

-- ---------------------------------------------------------------------------
-- Fixtures: one member, one editor, one admin, and a published root with a
-- draft child underneath it.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'rlstest-member@devhub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Test Member"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rlstest-editor@devhub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Test Editor"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'rlstest-admin@devhub.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"RLS Test Admin"}', now(), now());

-- The signup trigger creates all three as 'member'; promote two of them.
-- Runs here with no JWT context (direct SQL), which is exactly the
-- administrative path 20260816195853_fix_privilege_triggers_service_context
-- exists to keep unblocked.
update public.profiles set role = 'editor' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';

insert into public.doc_nodes (id, parent_id, slug, title, kind, status, content_md, author_id)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', null, 'rls-test-root', 'RLS Test Root', 'section', 'published', null, '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'rls-test-draft', 'RLS Test Draft', 'page', 'draft', 'secret draft content', '22222222-2222-2222-2222-222222222222');

-- ---------------------------------------------------------------------------
-- Helper: point the rest of the transaction at a given fixture user.
-- ---------------------------------------------------------------------------

create or replace function pg_temp.act_as(user_id uuid, role_claim text)
returns void
language sql
as $$
  select set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'user_role', role_claim)::text,
    true
  );
  select set_config('role', 'authenticated', true);
$$;

-- ---------------------------------------------------------------------------
-- Member: read-only, sees only published, cannot touch their own role.
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11111111-1111-1111-1111-111111111111', 'member');

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  0,
  'member cannot read a draft node'
);

select is(
  (select count(*)::int from public.doc_nodes where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'member can read a published node'
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

-- ---------------------------------------------------------------------------
-- Editor: sees drafts, can write content, cannot archive.
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

select * from finish();
rollback;
