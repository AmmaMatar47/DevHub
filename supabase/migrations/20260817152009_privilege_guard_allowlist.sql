-- 20260816195853 fixed a real bug (is_admin() defaulting to false outside
-- a PostgREST request meant no first admin could ever be created) by
-- skipping the guard unless auth.role() = 'authenticated'. That's a
-- deny-list: it only checks for one specific role string, so it silently
-- skips the guard for any other role too -- including `anon` and
-- `service_role` requests arriving through the API, where auth.role()
-- returns 'anon'/'service_role' rather than 'authenticated'. RLS happens
-- to make that non-exploitable today (anon has no write policy at all,
-- and service_role bypasses RLS by design), but it means the trigger's
-- own correctness quietly depends on RLS staying right elsewhere, rather
-- than being correct on its own terms.
--
-- Replaced with an allow-list keyed on whether a PostgREST request context
-- exists at all: request.jwt.claims is only ever set when a request came
-- in through the API (any role), and is null for genuine direct SQL --
-- migrations, seed scripts, the SQL editor, a raw psql session. Every API
-- request is now checked, including anon and service_role; only true
-- direct-SQL access bypasses the guard.

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('request.jwt.claims', true) is not null and not public.is_admin() then
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
     and current_setting('request.jwt.claims', true) is not null
     and not public.is_admin() then
    raise exception 'Only admins can archive or unarchive a node';
  end if;
  return new;
end;
$$;
