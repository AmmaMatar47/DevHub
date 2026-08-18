-- The old schedule called public.sweep_orphaned_images(), which the
-- fix_doc_image_storage_deletion migration just dropped (it could never
-- have worked -- see that migration's comment). Repointing the weekly job
-- at the sweep-orphaned-images edge function instead, invoked over HTTP via
-- pg_net since that's the only thing that can actually delete a storage
-- object.
create extension if not exists pg_net with schema extensions;

select cron.unschedule('sweep-orphaned-doc-images');

-- Requires a one-time manual step: this project's service role key must be
-- stored in Vault before the job can actually authenticate --
--   select vault.create_secret('<service-role-key>', 'doc_image_sweep_service_key', 'Auth for the weekly orphaned-doc-image sweep cron job to call the edge function');
-- Until that secret exists, this job runs weekly and fails cleanly (visible
-- in cron.job_run_details) rather than silently doing nothing -- it does
-- not delete anything without it. Deliberately not using the anon key here:
-- it would work (verify_jwt only checks the JWT is validly signed, not
-- which role), but that lets anyone holding the anon key -- effectively
-- the whole internet, since it ships in the client bundle -- trigger a
-- real deletion job on demand instead of just reading it.
select cron.schedule(
  'sweep-orphaned-doc-images',
  '0 3 * * 0', -- Sundays at 03:00 UTC
  $$
  select net.http_post(
    url := 'https://lsbqfnmxlmxlutuxvcnw.supabase.co/functions/v1/sweep-orphaned-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'doc_image_sweep_service_key'
        limit 1
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
