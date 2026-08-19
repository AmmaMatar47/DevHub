alter table public.doc_versions
  add column slug text,
  add column status public.doc_status,
  add column difficulty smallint,
  add column is_approximate boolean not null default false;

comment on column public.doc_versions.is_approximate is
  'True only for rows backfilled when these columns were added -- their slug/status/difficulty are the node''s current values at backfill time, not what was actually true when that version was created. Real snapshots (this column false) always reflect the true state at snapshot time.';

update public.doc_versions dv
set slug = dn.slug, status = dn.status, difficulty = dn.difficulty, is_approximate = true
from public.doc_nodes dn
where dn.id = dv.node_id;

alter table public.doc_versions
  alter column slug set not null,
  alter column status set not null;

create or replace function public.snapshot_doc_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published'
     and (new.content_md is distinct from old.content_md or new.title is distinct from old.title) then
    insert into public.doc_versions (node_id, title, content_md, slug, status, difficulty, edited_by)
    values (new.id, new.title, new.content_md, new.slug, new.status, new.difficulty, new.last_edited_by);
  end if;
  return new;
end;
$$;
