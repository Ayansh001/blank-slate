# StudyVault backend reconstruction on the new Supabase project

## Important finding first

The working project is currently a **blank Lovable starter**, not the StudyVault app. `src/` contains only `App.tsx`, `Index.tsx` (placeholder), `NotFound.tsx` and shadcn UI, and `supabase/` contains only `config.toml` — no Edge Functions, no migrations.

The full StudyVault app is still in git history at commit `9d99b37` (388 files under `src/`, 23 Edge Functions, 27 migration files, and the old generated `types.ts` describing 26 tables and ~20 RPC functions). A later commit reset the tree to the blank template and left duplicated leftovers (`package 2.json`, `index 2.html`, `tailwind.config 2.ts`, ...).

So the migration has two halves: restore the application from git history, then rebuild the backend it expects in the new Supabase project (`cyiphnsfdvajmptsezax`, currently empty — 0 tables, 0 buckets, 0 functions).

## What the audit found (source of truth = code at `9d99b37`)

Tables referenced by the app (from the old generated types + query audit):
advanced_quiz_sessions, ai_chat_messages, ai_chat_sessions, ai_daily_quotes, ai_history_preferences, ai_service_configs, ai_usage_tracking, concept_learning_sessions, content_relationships, daily_quote_preferences, document_analyses, files, folders, learning_analytics, note_enhancements, notes, notifications, ocr_chunks, ocr_jobs, ocr_orchestration, profiles, quiz_sessions, storage_analytics, study_goals, study_plans, study_sessions.

Database functions/RPC the app calls include: `ensure_user_profile`, `handle_new_user`, `track_learning_activity`, `insert_daily_quote`, `calculate_database_storage_usage`, `update_updated_at_column`, the OCR family (`create_ocr_chunk_job`, `initialize_chunked_ocr`, `update_chunk_progress`, `update_ocr_status_*`, `cleanup_*_ocr_jobs*`), plus `encrypt_api_key`.

Triggers: `on_auth_user_created` on new signup, per-table `updated_at` triggers, chat message-count trigger, OCR/files triggers.

Storage: one bucket `user-files` with per-user folder policies (`auth.uid()` = first path segment).

Edge Functions (23): ai-chat-handler, ai-chat-sse, ai-content-analyzer, ai-document-analysis, ai-gemini-chat, ai-multimodal-analysis, ai-note-enhancer, ai-quiz-generator, ai-quote-generator, ai-smart-organizer, ai-visual-quiz-generator, concept-learner-handler, concept-summary-handler, enhanced-concept-learner, gemini-concept-learner-v2, openai-chat-handler, openai-concept-learner-v2, openai-enhanced-concept-learner, openai-simple-chat, simple-note-enhancer, simple-quiz-generator, universal-ai-handler, youtube-search-handler.

Secrets they read: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-provided) and optional `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY`.

No enum types, no materialized views, no cron jobs and no realtime publication entries were found in the old SQL; realtime usage will be re-verified from the restored frontend code before enabling anything.

## Plan

1. **Restore the application** from commit `9d99b37`: all of `src/`, `public/`, `supabase/functions/`, `supabase/migrations/`, and the app's root configs (package.json, index.html, tailwind/vite/tsconfig). Remove the stray `* 2.*` duplicate files. No UI/UX redesign — a byte-level restore. Then install dependencies and confirm the dev build runs.
2. **Rebuild the schema** in the new project with dependency-ordered migrations: extensions → tables (26) with PKs, FKs to `auth.users`, NOT NULLs, defaults, checks, unique constraints → indexes → GRANTs for `authenticated`/`service_role` (and `anon` only where the app truly needs public reads). Columns and types are taken from the old generated `types.ts` plus the historical SQL, so names match the frontend exactly.
3. **Recreate functions and triggers**: all functions above with correct signatures, `SECURITY DEFINER` + pinned `search_path` where required, then `on_auth_user_created`, `updated_at` triggers, chat-count and OCR triggers.
4. **Recreate RLS**: enable RLS on every table and add owner-scoped policies (`auth.uid() = user_id`) for select/insert/update/delete, with service-role access for Edge Functions; `ai_daily_quotes` / reference-style tables get read-only access per the old policies. No table left unprotected, nothing left permissive.
5. **Storage**: create the private `user-files` bucket and re-add the per-user path policies for read/insert/update/delete.
6. **Realtime**: re-scan the restored code for `.channel(...)`/`postgres_changes` and add only the tables actually subscribed to the realtime publication.
7. **Deploy all 23 Edge Functions** to the new project and verify each responds (auth-required functions checked for a proper 401 rather than a crash).
8. **Compatibility + validation pass**: regenerate types, grep for any old project ref (`slizsctvvubqnqgsucsj`) and remove it, then check every `from('table')`, `rpc('fn')`, bucket name and `functions.invoke('name')` in the code against what now exists; run the build, typecheck and existing tests; run the Supabase security linter and fix migration-related findings.
9. **Report**: tables/functions/triggers/policies/indexes/buckets created, per-function deploy status, secrets you still need to add, and anything not recoverable.

## Notes and limits

- Only structure and logic are recreated. The old database's rows (users, notes, files, chat history, saved API keys) are not recoverable from the codebase, and no data will be invented. Existing users must sign up again on the new project; uploaded files in the old bucket are gone.
- Any column that existed only in the old live database and was never referenced by code or SQL cannot be known; if a runtime error later reveals one, it gets added as a follow-up migration.
- AI provider keys: the app stores per-user keys in `ai_service_configs`, so users re-enter them in Settings. Optional server fallbacks (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY`) will be requested as secrets if you want the fallback path active.
- `.env` already points at the new project, so no frontend credential edits are expected beyond the restore.
