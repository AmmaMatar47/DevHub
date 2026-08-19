create or replace function public.create_doc_node(
  p_parent_id uuid,
  p_title text,
  p_slug text,
  p_kind public.doc_kind
)
returns public.doc_nodes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_depth smallint;
  v_new_depth smallint;
  v_position integer;
  v_actor uuid;
  v_result public.doc_nodes;
begin
  if not (select public.is_editor()) then
    raise exception 'Only editors and admins can create pages';
  end if;

  if p_parent_id is not null then
    select depth into v_parent_depth from public.doc_nodes where id = p_parent_id;
    if not found then
      raise exception 'Parent node % does not exist', p_parent_id;
    end if;
    if v_parent_depth >= 3 then
      raise exception 'Cannot create a page here -- this section is already at the maximum nesting depth';
    end if;
    v_new_depth := v_parent_depth + 1;
  else
    v_new_depth := 0;
  end if;

  select coalesce(max(position) + 1, 0) into v_position
  from public.doc_nodes where parent_id is not distinct from p_parent_id;

  v_actor := auth.uid();

  insert into public.doc_nodes (parent_id, title, slug, kind, depth, position, status, author_id, last_edited_by)
  values (p_parent_id, p_title, p_slug, p_kind, v_new_depth, v_position, 'draft', v_actor, v_actor)
  returning * into v_result;

  return v_result;
end;
$$;

comment on function public.create_doc_node is
  'Single transactional entry point for node creation: permission check, depth-cap rejection, last-position assignment, and insert. New nodes always start as draft, authored by the caller.';
