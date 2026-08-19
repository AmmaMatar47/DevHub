create or replace function public.fix_subtree_depth(p_root_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  rec record;
  v_root_depth smallint;
begin
  select depth into v_root_depth from public.doc_nodes where id = p_root_id;
  for rec in select id from public.doc_nodes where parent_id = p_root_id loop
    update public.doc_nodes set depth = v_root_depth + 1 where id = rec.id;
    perform public.fix_subtree_depth(rec.id);
  end loop;
end;
$$;

comment on function public.fix_subtree_depth is
  'Recursively recomputes depth for every descendant of p_root_id. The M1 set_doc_node_depth trigger only ever updates the single row it fires for (before insert or update of parent_id, for each row) -- it does not cascade to children. This is the fix move_doc_node calls after re-parenting a node, so the whole moved subtree gets the correct depth, not just the moved node itself.';

create or replace function public.reorder_doc_children(p_parent_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
set search_path = public
as $$
declare
  v_expected_count integer;
  v_given_count integer;
  i integer;
begin
  if not (select public.is_editor()) then
    raise exception 'Only editors and admins can reorder nodes';
  end if;

  select count(*) into v_expected_count from public.doc_nodes where parent_id is not distinct from p_parent_id;
  v_given_count := coalesce(array_length(p_ordered_ids, 1), 0);
  if v_expected_count != v_given_count then
    raise exception 'reorder_doc_children: % ids given but % is the actual child count of %', v_given_count, v_expected_count, p_parent_id;
  end if;

  for i in 1 .. v_given_count loop
    update public.doc_nodes
    set "position" = i - 1
    where id = p_ordered_ids[i] and parent_id is not distinct from p_parent_id;
    if not found then
      raise exception 'reorder_doc_children: % is not a child of %', p_ordered_ids[i], p_parent_id;
    end if;
  end loop;
end;
$$;

create or replace function public.move_doc_node(p_node_id uuid, p_new_parent_id uuid, p_new_position integer)
returns void
language plpgsql
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

  with recursive subtree as (
    select id, 0 as rel_depth from public.doc_nodes where id = p_node_id
    union all
    select n.id, s.rel_depth + 1
    from public.doc_nodes n join subtree s on n.parent_id = s.id
  )
  select max(rel_depth) into v_subtree_height from subtree;

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

revoke execute on function public.fix_subtree_depth(uuid) from anon, authenticated, public;

-- One-off normalisation across the existing tree (import left arbitrary
-- positions like 90). Raw SQL, not reorder_doc_children -- a migration has
-- no authenticated editor session for that function's is_editor() check.
with ranked as (
  select id, row_number() over (partition by parent_id order by "position", created_at) - 1 as new_position
  from public.doc_nodes
)
update public.doc_nodes dn
set "position" = ranked.new_position
from ranked
where ranked.id = dn.id;
