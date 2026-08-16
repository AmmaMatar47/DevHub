-- Security-advisor fixes: pin search_path on every function (an unset
-- search_path lets a caller shadow an unqualified identifier with an
-- object from a schema they control) and stop handle_new_user from being
-- directly callable via RPC.

alter function public.custom_access_token_hook(jsonb) set search_path = public;
alter function public.prevent_non_admin_archive() set search_path = public;
alter function public.get_doc_tree() set search_path = public;
alter function public.snapshot_doc_version() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.prevent_profile_privilege_escalation() set search_path = public;
alter function public.current_role() set search_path = public;
alter function public.is_editor() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.set_doc_node_depth() set search_path = public;
alter function public.prevent_doc_node_cycle() set search_path = public;

-- Trigger functions can't actually be invoked outside a trigger context
-- (Postgres rejects it), but Supabase's PostgREST layer still exposes any
-- SECURITY DEFINER function as an RPC endpoint by default. Revoking the
-- implicit PUBLIC grant closes that off explicitly rather than relying on
-- the trigger-only restriction alone.
revoke execute on function public.handle_new_user() from public;
