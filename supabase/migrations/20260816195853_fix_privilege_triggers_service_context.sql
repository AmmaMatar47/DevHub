-- auth.jwt()/auth.role() are null outside a real PostgREST request (direct
-- SQL, migrations, the dashboard, service_role calls). Both privilege
-- triggers were checking is_admin(), which defaults to false with no JWT --
-- so administrative/service-role writes (seeding, ops scripts) were being
-- blocked by the same guard meant for end users. Only enforce the guard
-- when the request actually came in as `authenticated`; anything else is
-- already a trusted context by construction (raw DB access or service_role).

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change role';
    end if;
    if new.is_active is distinct from old.is_active then
      raise exception 'Only admins can change is_active';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_non_admin_archive()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archived_at is distinct from old.archived_at
     and auth.role() = 'authenticated'
     and not public.is_admin() then
    raise exception 'Only admins can archive or unarchive a node';
  end if;
  return new;
end;
$$;
