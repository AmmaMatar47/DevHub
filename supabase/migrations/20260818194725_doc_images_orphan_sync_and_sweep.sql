create or replace function public.extract_image_paths(content text)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(m[1]), array[]::text[])
  from regexp_matches(coalesce(content, ''), '!\[[^\]]*\]\(image:([^)]+)\)', 'g') as m;
$$;

create or replace function public.sync_doc_image_orphans()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_paths text[];
  new_paths text[];
begin
  if new.content_md is distinct from old.content_md then
    old_paths := public.extract_image_paths(old.content_md);
    new_paths := public.extract_image_paths(new.content_md);

    update public.doc_images
    set orphaned_at = now()
    where node_id = new.id
      and orphaned_at is null
      and storage_path = any(old_paths)
      and not (storage_path = any(new_paths));

    update public.doc_images
    set orphaned_at = null
    where node_id = new.id
      and orphaned_at is not null
      and storage_path = any(new_paths);
  end if;
  return new;
end;
$$;

create trigger doc_nodes_sync_image_orphans
after update on public.doc_nodes
for each row
execute function public.sync_doc_image_orphans();

create table public.doc_image_sweep_log (
  id bigint generated always as identity primary key,
  doc_image_id uuid not null,
  node_id uuid,
  storage_path text not null,
  full_path text not null,
  byte_size integer,
  orphaned_at timestamptz,
  swept_at timestamptz not null default now()
);

comment on table public.doc_image_sweep_log is
  'Audit trail for sweep_orphaned_images() -- one row per image actually deleted, kept indefinitely (it is tiny and this is the only record once the image is gone).';

create or replace function public.sweep_orphaned_images()
returns setof public.doc_image_sweep_log
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  logged public.doc_image_sweep_log;
begin
  for rec in
    select di.id, di.node_id, di.storage_path, di.full_path, di.byte_size, di.orphaned_at
    from public.doc_images di
    where di.orphaned_at is not null
      and di.orphaned_at < now() - interval '30 days'
      and not exists (
        select 1 from public.doc_versions dv
        where dv.node_id = di.node_id
          and dv.content_md like '%' || di.storage_path || '%'
      )
  loop
    delete from storage.objects
    where bucket_id = 'doc-images' and name in (rec.storage_path, rec.full_path);
    delete from public.doc_images where id = rec.id;
    insert into public.doc_image_sweep_log (doc_image_id, node_id, storage_path, full_path, byte_size, orphaned_at)
    values (rec.id, rec.node_id, rec.storage_path, rec.full_path, rec.byte_size, rec.orphaned_at)
    returning * into logged;
    return next logged;
  end loop;
  return;
end;
$$;

create or replace function public.delete_doc_node_images(target_node_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
begin
  for rec in select storage_path, full_path from public.doc_images where node_id = target_node_id
  loop
    delete from storage.objects
    where bucket_id = 'doc-images' and name in (rec.storage_path, rec.full_path);
  end loop;
  delete from public.doc_images where node_id = target_node_id;
end;
$$;

comment on function public.delete_doc_node_images(uuid) is
  'Not called anywhere yet -- ready for M4b''s node hard-delete to call before the node row itself is removed, since doc_images.node_id cascades on delete (the rows would vanish with the node) but the actual storage objects would not, so the paths have to be read and deleted first.';
