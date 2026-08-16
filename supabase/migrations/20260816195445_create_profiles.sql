-- Profiles, roles, the auth.users sync trigger, and the JWT custom access
-- token hook that stamps `role` into every session's claims.

create type public.user_role as enum ('admin', 'editor', 'member');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role public.user_role not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users row, created automatically on signup.';

-- Generic updated_at maintenance, reused by every table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- New auth.users row -> matching profiles row, always starting as 'member'.
-- Signup itself is invite-only (auth.enable_signup = false), so this only
-- ever fires for accounts created from the Supabase dashboard.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'member'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Column-level privilege guard: RLS below lets a user update their own row,
-- but role/is_active must stay admin-only. RLS is row-level, not
-- column-level, so that boundary is enforced here instead.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
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
-- (created after public.is_admin() below; trigger attached at end of file)

-- ---------------------------------------------------------------------------
-- JWT role helpers. These read auth.jwt() only -- never public.profiles --
-- so that RLS policies built on top of them can't recurse into profiles'
-- own RLS.
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns public.user_role
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'user_role')::public.user_role,
    'member'::public.user_role
  );
$$;

create or replace function public.is_editor()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('editor', 'admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'admin';
$$;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- Custom access token hook -- stamps the profile's role into `user_role` on
-- every issued JWT. Registered in supabase/config.toml
-- ([auth.hook.custom_access_token]); on the hosted project this also needs
-- enabling once under Authentication > Hooks in the dashboard.
-- ---------------------------------------------------------------------------

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public.user_role;
begin
  select role into user_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(user_role, 'member'::public.user_role)));
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$;

-- The auth service (not the requesting user) invokes this hook, so it needs
-- its own grants -- it does not go through a client session or RLS.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

grant select on public.profiles to supabase_auth_admin;

-- Row Level Security for this and every other table is enabled together in
-- 20260816120400_enable_rls.sql, once all tables and helper functions exist.
