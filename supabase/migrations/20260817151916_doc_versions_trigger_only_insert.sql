-- The doc_versions_insert_editor policy from 20260816195604_enable_rls.sql
-- was added so the doc_nodes_snapshot_version trigger (which ran as the
-- editing user, not security definer) could write. But RLS can't
-- distinguish "the trigger is inserting" from "the client is inserting
-- directly" -- so it also let any editor bypass the trigger and write
-- doc_versions rows by hand, defeating the point of an append-only,
-- trigger-only history table.
--
-- Fix: make the trigger function SECURITY DEFINER (it now runs as the
-- function owner, which owns the table, and table owners bypass RLS by
-- default) and drop the client-facing insert policy entirely. No
-- `authenticated` request -- editor or otherwise -- can insert into
-- doc_versions anymore; only the trigger can.

create or replace function public.snapshot_doc_version()
returns trigger
language plpgsql
security definer
set search_path = public
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

drop policy if exists "doc_versions_insert_editor" on public.doc_versions;
