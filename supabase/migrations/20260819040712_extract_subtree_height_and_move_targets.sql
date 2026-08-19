-- Single source of truth for "how tall is this node's subtree" -- both
-- move_doc_node's cap check and get_move_targets' per-candidate validity
-- call this, so the two can never drift apart the way a duplicated formula
-- eventually would.
create or replace function public.subtree_height(p_node_id uuid)
returns integer
language sql
stable
set search_path = public
as $$
  with recursive subtree as (
    select id, 0 as rel_depth from public.doc_nodes where id = p_node_id
    union all
    select n.id, s.rel_depth + 1
    from public.doc_nodes n join subtree s on n.parent_id = s.id
  )
  select max(rel_depth) from subtree;
$$;

create or replace function public.move_doc_node(p_node_id uuid, p_new_parent_id uuid, p_new_position integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_parent_id uuid;
  v_new_parent_depth smallint;
  v_subtree_height integer;
  v_new_siblings uuid[];
begin
  if not (select public.is_editor()) then
    raise exception 'Only editors and admins can move nodes';
  end if;

  select parent_id into v_old_parent_id from public.doc_nodes where id = p_node_id;
  if not found then
    raise exception 'Node % does not exist', p_node_id;
  end if;

  if p_new_parent_id is not null then
    select depth into v_new_parent_depth from public.doc_nodes where id = p_new_parent_id;
    if not found then
      raise exception 'Target parent % does not exist', p_new_parent_id;
    end if;
  else
    v_new_parent_depth := -1;
  end if;

  v_subtree_height := public.subtree_height(p_node_id);

  if v_new_parent_depth + 1 + v_subtree_height > 3 then
    raise exception 'Moving this node here would put its deepest descendant % level(s) past the maximum nesting depth', (v_new_parent_depth + 1 + v_subtree_height - 3);
  end if;

  update public.doc_nodes
  set "position" = "position" + 1
  where parent_id is not distinct from p_new_parent_id
    and "position" >= p_new_position
    and id != p_node_id;

  update public.doc_nodes
  set parent_id = p_new_parent_id, "position" = p_new_position
  where id = p_node_id;

  perform public.fix_subtree_depth(p_node_id);

  select array_agg(id order by "position", created_at) into v_new_siblings
  from public.doc_nodes where parent_id is not distinct from p_new_parent_id;
  perform public.reorder_doc_children(p_new_parent_id, v_new_siblings);

  if v_old_parent_id is distinct from p_new_parent_id then
    perform public.reorder_doc_children(
      v_old_parent_id,
      (select array_agg(id order by "position", created_at) from public.doc_nodes where parent_id is not distinct from v_old_parent_id)
    );
  end if;
end;
$$;

-- Everything a "Move to..." picker needs in one call: the full tree (minus
-- the moved node's own subtree, which can never be a valid target and isn't
-- worth showing), each candidate flagged valid/invalid with a human reason
-- -- using the exact same subtree_height() the move itself validates
-- against, not a client-side reimplementation of the cap arithmetic.
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
    select doc_nodes.id from public.doc_nodes where doc_nodes.id = p_node_id
    union all
    select n.id from public.doc_nodes n join own_subtree s on n.parent_id = s.id
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
  where t.id not in (select id from own_subtree)
  order by t.depth, t.path;
end;
$$;

comment on function public.get_move_targets is
  'Candidate targets for "Move to..." on p_node_id: the whole tree minus its own subtree, each flagged valid/invalid via the same subtree_height() the move itself validates against.';
