create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.doc_tags (
  node_id uuid not null references public.doc_nodes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (node_id, tag_id)
);

create index doc_tags_tag_id_idx on public.doc_tags (tag_id);
