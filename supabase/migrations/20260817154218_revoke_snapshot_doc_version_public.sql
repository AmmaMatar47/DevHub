-- The previous revoke targeted anon/authenticated directly, but PUBLIC
-- itself still held EXECUTE (the default grant every new function gets),
-- and anon/authenticated inherit through PUBLIC regardless of any
-- per-role revoke on top of it. Revoking from PUBLIC is what actually
-- closes this off -- same two-step pattern as handle_new_user in M1.
revoke execute on function public.snapshot_doc_version() from public;
