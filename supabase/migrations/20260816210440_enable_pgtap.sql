-- pgtap was enabled manually via execute_sql during M1 verification and was
-- never captured in a migration -- a from-scratch replay would be missing
-- it, and supabase/tests/rls.sql would fail with "function plan(integer)
-- does not exist". Tracking it properly here.
create extension if not exists pgtap with schema extensions;
