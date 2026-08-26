-- Storage policies for user-files (owner-scoped by first path segment)
CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Lock down SECURITY DEFINER functions: revoke from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.encrypt_api_key(text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_ocr_jobs_simple() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_ocr_jobs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_ocr_jobs() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_ocr_jobs_enhanced() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_ocr_jobs_unlimited() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_chat_session_message_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_files_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_ai_history_preferences_timestamp() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_ocr_status(uuid, uuid, text, double precision, character varying, character varying) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_ocr_status_simple(uuid, uuid, text, double precision, character varying, character varying) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_ocr_status_enhanced(uuid, uuid, text, double precision, character varying, character varying, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_ocr_chunk_job(uuid, uuid, integer, integer, text, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.initialize_chunked_ocr(uuid, uuid, integer, integer, text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_chunk_progress(uuid, uuid, text, text, double precision, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_user_profile(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_daily_quote(uuid, text, text, text, text, date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_learning_activity(uuid, character varying, jsonb, double precision, integer, text[], integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_ocr_status_comprehensive(uuid, uuid, text, double precision, character varying, character varying) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_database_storage_usage(uuid) FROM anon, authenticated;

-- Re-grant only the functions the frontend calls, to signed-in users
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