-- Belt and braces on top of is_enabled(): makes deactivation instant rather
-- than merely effective. auth.admin.signOut needs the service role, which a
-- static SPA can't hold, so this happens in the database instead. Deleting
-- the user's auth.sessions rows invalidates their refresh token, so
-- supabase-js can no longer silently renew access. The already-issued
-- access token stays valid until it expires (a JWT can't be revoked early),
-- which is exactly why is_enabled() in the RLS policies is the real
-- enforcement -- this trigger is the second layer, not the first.

create or replace function public.revoke_sessions_on_deactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_active = true and new.is_active = false then
    delete from auth.sessions where user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger profiles_revoke_sessions_on_deactivation
  after update on public.profiles
  for each row execute function public.revoke_sessions_on_deactivation();
