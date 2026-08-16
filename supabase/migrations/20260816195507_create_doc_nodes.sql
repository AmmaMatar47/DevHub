-- The unified documentation tree: every section and page is a doc_nodes row.
-- Modelled on how MDN structures its docs -- a node can be a pure grouping
-- ('section') or a leaf with content ('page'), nested up to 4 levels deep.

create type public.doc_kind as enum ('section', 'page');
create type public.doc_status as enum ('draft', 'needs_review', 'published');
create type public.doc_origin as enum ('team', 'course', 'generated');

create table public.doc_nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.doc_nodes (id) on delete restrict,
  slug text not null,
  title text not null,
  "position" integer not null default 0,
  depth smallint not null default 0,
  kind public.doc_kind not null default 'page',
  content_md text,
  status public.doc_status not null default 'draft',
  origin public.doc_origin not null default 'team',
  difficulty smallint,
  author_id uuid references public.profiles (id),
  last_edited_by uuid references public.profiles (id),
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_md, '')), 'B')
  ) stored,
  constraint doc_nodes_depth_check check (depth between 0 and 3),
  constraint doc_nodes_difficulty_check check (difficulty is null or difficulty between 1 and 3),
  constraint doc_nodes_not_self_parent check (parent_id is distinct from id)
);

comment on table public.doc_nodes is 'Nested docs tree, max depth 3 (4 levels: root..depth 3).';
comment on column public.doc_nodes."position" is 'Sort order among siblings under the same parent_id.';

-- slug is unique per parent -- NULL parent_id (root nodes) needs its own
-- partial index since NULL never equals NULL in a plain UNIQUE constraint.
create unique index doc_nodes_parent_slug_key on public.doc_nodes (parent_id, slug) where parent_id is not null;
create unique index doc_nodes_root_slug_key on public.doc_nodes (slug) where parent_id is null;

create index doc_nodes_parent_id_idx on public.doc_nodes (parent_id);
create index doc_nodes_parent_position_idx on public.doc_nodes (parent_id, "position");
create index doc_nodes_status_idx on public.doc_nodes (status);
create index doc_nodes_search_vector_idx on public.doc_nodes using gin (search_vector);

create trigger doc_nodes_set_updated_at
  before update on public.doc_nodes
  for each row execute function public.set_updated_at();

-- depth is derived, never client-supplied: 0 for roots, else parent's depth + 1.
create or replace function public.set_doc_node_depth()
returns trigger
language plpgsql
as $$
declare
  parent_depth smallint;
begin
  if new.parent_id is null then
    new.depth := 0;
  else
    select depth into parent_depth from public.doc_nodes where id = new.parent_id;
    if parent_depth is null then
      raise exception 'Parent node % does not exist', new.parent_id;
    end if;
    new.depth := parent_depth + 1;
  end if;
  return new;
end;
$$;

create trigger doc_nodes_set_depth
  before insert or update of parent_id on public.doc_nodes
  for each row execute function public.set_doc_node_depth();

-- Walk up from the new parent to the root; if we hit `new.id` along the way,
-- the move would make the node its own ancestor. Only matters on UPDATE --
-- a brand-new row can't yet have descendants.
create or replace function public.prevent_doc_node_cycle()
returns trigger
language plpgsql
as $$
declare
  ancestor_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  ancestor_id := new.parent_id;
  while ancestor_id is not null loop
    if ancestor_id = new.id then
      raise exception 'Cannot move node % under its own descendant', new.id;
    end if;
    select parent_id into ancestor_id from public.doc_nodes where id = ancestor_id;
  end loop;

  return new;
end;
$$;

create trigger doc_nodes_prevent_cycle
  before update of parent_id on public.doc_nodes
  for each row execute function public.prevent_doc_node_cycle();

-- Only admins may archive/unarchive (spec: editors write content, admins
-- own lifecycle). Everything else stays open to any editor-level update.
create or replace function public.prevent_non_admin_archive()
returns trigger
language plpgsql
as $$
begin
  if new.archived_at is distinct from old.archived_at and not public.is_admin() then
    raise exception 'Only admins can archive or unarchive a node';
  end if;
  return new;
end;
$$;

create trigger doc_nodes_prevent_non_admin_archive
  before update on public.doc_nodes
  for each row execute function public.prevent_non_admin_archive();

-- Single-call full tree for sidebar rendering. SQL function => security
-- invoker by default, so the caller's own doc_nodes RLS policy still
-- applies row-by-row (members only ever see published, non-archived nodes;
-- editors/admins see everything).
create or replace function public.get_doc_tree()
returns table (
  id uuid,
  parent_id uuid,
  slug text,
  title text,
  "position" integer,
  depth smallint,
  kind public.doc_kind,
  status public.doc_status,
  path text[]
)
language sql
stable
as $$
  with recursive tree as (
    select
      n.id, n.parent_id, n.slug, n.title, n."position", n.depth, n.kind, n.status,
      array[n.slug] as path
    from public.doc_nodes n
    where n.parent_id is null and n.archived_at is null

    union all

    select
      n.id, n.parent_id, n.slug, n.title, n."position", n.depth, n.kind, n.status,
      tree.path || n.slug
    from public.doc_nodes n
    join tree on n.parent_id = tree.id
    where n.archived_at is null
  )
  select * from tree order by depth, "position";
$$;
