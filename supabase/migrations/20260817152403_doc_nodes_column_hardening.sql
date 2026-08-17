-- Column-level hardening for doc_nodes/doc_versions.
--
-- difficulty already has its check constraint from 20260816195507
-- (doc_nodes_difficulty_check) -- confirmed still in place, nothing to add
-- there.

-- author_id defaults to the calling user; the client should never need to
-- (and shouldn't) supply it explicitly. In direct-SQL contexts (seeding,
-- migrations) auth.uid() is null, same as today.
alter table public.doc_nodes
  alter column author_id set default auth.uid();

-- last_edited_by is set by the server, not the client: every real request
-- overwrites whatever the client sent with the actual caller. Direct SQL
-- (no request context) leaves it untouched, so migrations/seed scripts
-- don't null out authorship data that isn't theirs to set.
create or replace function public.set_last_edited_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('request.jwt.claims', true) is not null then
    new.last_edited_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger doc_nodes_set_last_edited_by
  before update on public.doc_nodes
  for each row execute function public.set_last_edited_by();

-- slug shows up directly in URLs -- lowercase kebab-case only.
alter table public.doc_nodes
  add constraint doc_nodes_slug_kebab_case check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Cheap history listing: (node_id) alone is now a redundant left-prefix of
-- this composite index, so it's dropped rather than kept alongside it.
drop index if exists doc_versions_node_id_idx;
create index doc_versions_node_id_created_at_idx on public.doc_versions (node_id, created_at desc);
