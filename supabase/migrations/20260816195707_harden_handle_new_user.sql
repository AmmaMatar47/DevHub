-- REVOKE ... FROM PUBLIC alone didn't cover it: Supabase grants EXECUTE on
-- every new public-schema function to anon/authenticated directly (not just
-- via PUBLIC), so each needs its own explicit revoke.
revoke execute on function public.handle_new_user() from anon, authenticated;
