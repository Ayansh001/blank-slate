DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_daily_quote(uuid, text, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_learning_activity(uuid, character varying, jsonb, double precision, integer, text[], integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ocr_status_comprehensive(uuid, uuid, text, double precision, character varying, character varying) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_database_storage_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_chunked_ocr(uuid, uuid, integer, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_chunk_progress(uuid, uuid, text, text, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ocr_chunk_job(uuid, uuid, integer, integer, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ocr_status(uuid, uuid, text, double precision, character varying, character varying) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ocr_status_simple(uuid, uuid, text, double precision, character varying, character varying) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ocr_status_enhanced(uuid, uuid, text, double precision, character varying, character varying, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_ocr_jobs_enhanced() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_ocr_jobs_unlimited() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_ocr_jobs() TO authenticated;