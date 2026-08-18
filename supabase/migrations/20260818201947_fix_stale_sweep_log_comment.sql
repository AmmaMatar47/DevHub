-- Stale since fix_doc_image_storage_deletion dropped sweep_orphaned_images()
-- in favor of the sweep-orphaned-images edge function.
comment on table public.doc_image_sweep_log is
  'Audit trail for the sweep-orphaned-images edge function -- one row per image actually deleted, kept indefinitely (it is tiny and this is the only record once the image is gone).';
