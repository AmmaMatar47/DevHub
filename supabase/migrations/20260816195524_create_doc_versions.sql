-- Append-only history of published edits. No client ever inserts here
-- directly; the trigger below is the only writer.

create table public.doc_versions (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.doc_nodes (id) on delete cascade,
  title text not null,
  content_md text,
  edited_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.doc_versions is 'Append-only snapshots, one per published edit. No update/delete path.';

create index doc_versions_node_id_idx on public.doc_versions (node_id);

-- Fires on every doc_nodes update; only actually writes a snapshot when the
-- edited row is published and its title/content changed.
create or replace function public.snapshot_doc_version()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published'
     and (new.content_md is distinct from old.content_md or new.title is distinct from old.title) then
    insert into public.doc_versions (node_id, title, content_md, edited_by)
    values (new.id, new.title, new.content_md, new.last_edited_by);
  end if;
  return new;
end;
$$;

create trigger doc_nodes_snapshot_version
  after update on public.doc_nodes
  for each row execute function public.snapshot_doc_version();
