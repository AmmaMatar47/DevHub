-- Making snapshot_doc_version() SECURITY DEFINER (20260817151916) reintroduced
-- the same class of issue fixed for handle_new_user in M1: any SECURITY
-- DEFINER function is exposed by PostgREST as a directly-callable RPC
-- endpoint by default, regardless of it being a trigger-only function that
-- can't actually run outside a trigger context. Closing it explicitly.
revoke execute on function public.snapshot_doc_version() from anon, authenticated;
