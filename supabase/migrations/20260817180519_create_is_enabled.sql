-- is_active was enforced only client-side until now: a deactivated user's
-- already-issued JWT is still cryptographically valid and still carries
-- user_role, and supabase-js keeps silently renewing the refresh token, so
-- access never actually lapses. No RLS policy checked is_active anywhere.
--
-- Stamping is_active into the JWT hook (alongside user_role) would NOT fix
-- this -- a JWT is stateless, so an already-issued token would keep
-- asserting is_active: true until it expires, the same staleness window
-- just relocated. This function reads profiles directly instead, so
-- enforcement is immediate with no token window.
--
-- STABLE means Postgres evaluates it once per statement, not once per row --
-- one indexed lookup per query, not per row scanned.
--
-- Defaults to false when no profile row exists. Fail closed.

create or replace function public.is_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where id = auth.uid()),
    false
  );
$$;
