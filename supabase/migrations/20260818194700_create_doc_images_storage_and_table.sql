insert into storage.buckets (id, name, public)
values ('doc-images', 'doc-images', false)
on conflict (id) do nothing;

create policy doc_images_storage_select on storage.objects
for select to authenticated
using (bucket_id = 'doc-images' and (select private.is_enabled()));

create policy doc_images_storage_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'doc-images' and (select private.is_enabled()) and (select is_editor()));

create policy doc_images_storage_delete on storage.objects
for delete to authenticated
using (bucket_id = 'doc-images' and (select private.is_enabled()) and (select is_admin()));

create table public.doc_images (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.doc_nodes(id) on delete cascade,
  storage_path text not null unique,
  full_path text not null,
  alt_text text,
  width integer not null,
  height integer not null,
  byte_size integer not null,
  uploaded_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  orphaned_at timestamptz
);

comment on table public.doc_images is
  'Images referenced from doc_nodes.content_md via the image: scheme. storage_path is the display tier (<=1400px, used inline); full_path is the full-resolution tier (lightbox only). orphaned_at is set by sync_doc_image_orphans() when a reference disappears from content_md on save -- never deleted immediately, since doc_versions may still reference it for restore.';

create index doc_images_node_id_idx on public.doc_images(node_id);
create index doc_images_orphaned_at_idx on public.doc_images(orphaned_at) where orphaned_at is not null;

alter table public.doc_images enable row level security;

-- Editors/admins see every doc_images row regardless of the owning node's
-- status (draft/needs_review included, matching their doc_nodes visibility);
-- everyone else only sees rows for published, non-archived nodes.
create policy doc_images_select on public.doc_images
for select to authenticated
using (
  (select private.is_enabled())
  and (
    (select is_editor())
    or exists (
      select 1 from public.doc_nodes n
      where n.id = doc_images.node_id
        and n.status = 'published'
        and n.archived_at is null
    )
  )
);

create policy doc_images_insert_editor on public.doc_images
for insert to authenticated
with check ((select private.is_enabled()) and (select is_editor()));

create policy doc_images_update_editor on public.doc_images
for update to authenticated
using ((select private.is_enabled()) and (select is_editor()))
with check ((select private.is_enabled()) and (select is_editor()));

create policy doc_images_delete_admin on public.doc_images
for delete to authenticated
using ((select private.is_enabled()) and (select is_admin()));
