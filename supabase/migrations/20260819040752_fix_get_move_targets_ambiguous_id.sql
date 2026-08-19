-- get_move_targets' OUT parameter `id` (from `returns table(id uuid, ...)`)
-- collided with the `id` column alias inside its own CTE, producing
-- "column reference id is ambiguous". Renamed the CTE's column so the
-- exclusion filter unambiguously refers to the CTE, not the OUT parameter.

create or replace function public.get_move_targets(p_node_id uuid)
returns table (
  id uuid,
  parent_id uuid,
  slug text,
  title text,
  kind doc_kind,
  depth smallint,
  path text[],
  is_valid boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_subtree_height integer;
begin
  if not (select public.is_editor()) then
    raise exception 'Only editors and admins can move nodes';
  end if;

  v_subtree_height := public.subtree_height(p_node_id);

  return query
  with recursive own_subtree as (
    select doc_nodes.id as node_id from public.doc_nodes where doc_nodes.id = p_node_id
    union all
    select n.id from public.doc_nodes n join own_subtree s on n.parent_id = s.node_id
  ),
  tree as (
    select
      n.id, n.parent_id, n.slug, n.title, n.kind, n.depth,
      array[n.slug] as path
    from public.doc_nodes n
    where n.parent_id is null and n.archived_at is null

    union all

    select
      n.id, n.parent_id, n.slug, n.title, n.kind, n.depth,
      tree.path || n.slug
    from public.doc_nodes n
    join tree on n.parent_id = tree.id
    where n.archived_at is null
  )
  select
    t.id, t.parent_id, t.slug, t.title, t.kind, t.depth, t.path,
    (t.depth + 1 + v_subtree_height <= 3) as is_valid,
    case when t.depth + 1 + v_subtree_height > 3
      then format('Would put the deepest moved page %s level(s) past the maximum nesting depth', t.depth + 1 + v_subtree_height - 3)
      else null
    end as reason
  from tree t
  where t.id not in (select own_subtree.node_id from own_subtree)
  order by t.depth, t.path;
end;
$$;
