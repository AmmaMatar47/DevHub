create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'sweep-orphaned-doc-images',
  '0 3 * * 0', -- Sundays at 03:00 UTC
  $$select public.sweep_orphaned_images()$$
);
