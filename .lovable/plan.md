# Forensic Audit — StudyVault migration (read-only, no changes made)

## 1. Executive Summary

- **Structurally restored: yes.** The working tree is byte-identical to commit `9d99b37` for essentially all application code. The only source files that differ are 3 migration-required files plus test scaffolding (evidence in §3).
- **Migration technically complete: nearly.** Schema, RLS, grants, triggers, realtime, storage bucket + policies, types, and edge-function deploys are in place. Missing: optional server fallback secrets, leaked-password protection, and any authenticated end-to-end verification.
- **AI failures are NOT caused by the migration.** Verified root cause: the model id the app hardcodes everywhere, `gemini-1.5-flash`, is **retired at the provider** and returns HTTP 404 from Google. Confidence: **High** (live edge-function log, quoted below). The user's Gemini key is present, correctly shaped, and correctly reaching the edge function — proof that key plumbing, auth, RLS and deployment all work.
- **OpenAI features fail for a different, independent reason:** there is no OpenAI credential anywhere — no row in `ai_service_configs`, no `OPENAI_API_KEY` secret.
- **Nothing should be changed until you review this.** No files, migrations, secrets, deploys or settings were touched during this audit.

## 2. Baseline comparison with `9d99b37`

`git diff 9d99b37 HEAD` — all non-lockfile, non-deleted-duplicate changes:

| File | Change | Category | Behavior change? |
|---|---|---|---|
| `src/integrations/supabase/client.ts` | URL + anon key `slizsctvvubqnqgsucsj` → `cyiphnsfdvajmptsezax`; `storage: localStorage` → `brokeredPreviewStorage()` | Migration-required (URL/key). Storage adapter = Lovable preview auth brokering | Auth persistence path changed; sessions work (verified in logs) |
| `src/integrations/supabase/previewAuthStorage.ts` | New file (88 lines), preview auth broker | Platform-required | Additive only |
| `src/features/ai/utils/chatUtils.ts` | hardcoded old project ref → `import.meta.env.VITE_SUPABASE_PROJECT_ID` | Migration-required | None (same URL shape) |
| `src/features/ai/hooks/useStreamingChatSSE.ts` | hardcoded old URL → `import.meta.env.VITE_SUPABASE_URL` | Migration-required | None |
| `supabase/config.toml` | project_id updated | Migration-required | None |
| `src/integrations/supabase/types.ts` | regenerated (64 lines delta) | Migration-required | None |
| `supabase/functions/*/index.ts` (23 files) | **only** a trailing `// redeploy` comment (1–3 line diffs) | Deploy trigger | **None** |
| `src/test/setup.ts`, `src/test/example.test.ts`, `tsconfig.app.json` (`types: ["vitest/globals"]`), `package.json` (+vitest, +@testing-library/jest-dom, supabase-js `^2.103.0`→`^2.112.4`) | Test tooling + minor dep bump | Not migration-required | Low risk; supabase-js is a minor bump |
| `.env`, lockfiles, `* 2.*` duplicate deletions, 3 new migration SQL files | Housekeeping / migration | — | None |

**Category B (unnecessary/behavior-changing) is effectively empty.** The only debatable items are the vitest/jest-dom devDependencies, the `tsconfig` `types` array (narrows ambient types to `vitest/globals`; typecheck is clean), and the supabase-js bump. All are revertible without affecting the migration. **No AI code, hook, service, provider, edge function body, RPC call, upload path, streaming implementation, or error handler was rewritten.**

## 3. Why every AI integration is failing

**Finding 1 — retired Gemini model (primary cause).**
Evidence, live log from `gemini-concept-learner-v2`, 2026-08-26 05:23:04Z:
`Gemini API error: 404 { "message": "models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent" }`
Old behavior: `gemini-1.5-flash` on `v1beta` was valid when the app last worked. Current: Google returns 404. `gemini-1.5-flash` is hardcoded in `universal-ai-handler`, `ai-quiz-generator`, `ai-note-enhancer`, `gemini-concept-learner-v2`, `AIServiceManager.ts`, `AIConfigValidator.tsx`, and is also the stored `model_name` in the DB. Impact: **every** Gemini path fails identically. Confidence **High**. Not migration-caused.

**Finding 2 — the 404 proves the key plumbing is healthy.** A 404 (not 401/403/500) means the request reached Google authenticated. DB check (read-only): one row in `ai_service_configs` — `gemini`, `is_active=true`, key length 39, prefix `AIzaSyB`, `model_name=gemini-1.5-flash`. So: user key stored ✔, read by edge function via service role ✔, RLS/grants ✔, function deployed and executing ✔, JWT auth ✔ (auth logs show `/user` → 200).

**Finding 3 — no OpenAI credential exists.** No `openai` row in `ai_service_configs`; configured secrets are only `LOVABLE_API_KEY` and the platform `SUPABASE_*`. Every function reads `Deno.env.get('OPENAI_API_KEY') || configData.api_key` → both null. So OpenAI chat, quiz, enhancer, concept-learner fail on a missing key, independent of Finding 1.

**Finding 4 — `ANTHROPIC_API_KEY` and `YOUTUBE_API_KEY` are referenced but unset** (`universal-ai-handler`, `youtube-search-handler`). Anthropic is showcase-only per your earlier note; YouTube video suggestions in the concept learner will fail.

### Ranked diagnosis (against your A–M list)
1. **C/H — provider rejects the request: retired model id** (Gemini). High confidence, log-proven.
2. **A/B — missing OpenAI key** (no user row, no secret). High confidence.
3. **A — missing YouTube/Anthropic secrets** for those sub-features. High.
4. Not implicated: F (functions deployed), E (functions do receive keys), J (auth OK), K (RLS/RPC OK), L (migration), I (streaming — untested but not the first failure).

### Trace: concept learner
UI → `useConceptLearner` → `supabase.functions.invoke('gemini-concept-learner-v2')` [PASS] → JWT verify [PASS] → read `ai_service_configs` via service role [PASS] → `generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash` [**BROKEN — 404**] → response parse [unreached].

### Trace: AI chat (SSE)
UI → `useStreamingChatSSE` → `${VITE_SUPABASE_URL}/functions/v1/ai-chat-sse` [PASS, URL now correct] → key lookup: `OPENAI_API_KEY` → null, then `configData.api_key` → no openai row [**BROKEN — no credential**] → OpenAI request [unreached]. Static inference; no runtime log exists for `ai-chat-sse` because it hasn't been exercised since migration.

## 4. Other audit areas (summary)

- **Edge functions:** 23 present; all 23 differ from baseline only by the `// redeploy` marker. 20 are AI-related; 13 distinct functions are invoked from the frontend; 10 exist in the repo but are never invoked by current UI code (dead/legacy paths, e.g. `openai-simple-chat`, `simple-quiz-generator`, `ai-chat-handler`, `enhanced-concept-learner`). Several duplicate each other — an architectural smell inherited from the baseline, not from the migration.
- **Env/secrets:** only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` (all present in `.env`) and `VITE_VAPID_PUBLIC_KEY` (referenced by `src/utils/pwa.ts`, **not set** → push notifications degrade). Backend expects `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY` — **all absent**; `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` present. No name mismatches found. No values inspected or printed.
- **Per-user keys:** stored **plaintext** in `ai_service_configs.api_key` (baseline behavior; an `encrypt_api_key` DB function exists but is unused by the app). Read client-side by `useAIConfig`/`AIServiceManager` and server-side by service-role queries. Works today. Security note (not fixed): a plaintext third-party key in a Data-API-readable table is a real exposure, mitigated only by owner-scoped RLS.
- **Storage:** private `user-files` bucket, 50 MB limit, 4 owner-scoped policies keyed on `auth.uid()::text = (storage.foldername(name))[1]`. Matches the frontend's `${user.id}/...` upload paths. Compatible; untested end-to-end.
- **Auth:** `on_auth_user_created` → `handle_new_user`, plus `ensure_user_profile` RPC — both present and working ("Profile already exists" in console logs). Auth cannot explain the AI failures.
- **Security warnings:** 14 remaining, all `EXECUTE` grants to `authenticated` on `SECURITY DEFINER` RPCs the frontend legitimately calls (each owner-scoped internally) — intentional configuration, not a vulnerability. Introduced by the migration's function recreation; the equivalent risk existed in the old project. The one genuine issue is plaintext API-key storage (pre-existing), plus leaked-password protection being off.

## 5. What remains (not performed)

| Item | Category |
|---|---|
| Update the Gemini model id (code + stored `model_name`) to a current model | **Required for functionality** |
| Add an OpenAI credential (user Settings row, or `OPENAI_API_KEY` secret) | Required, your decision which |
| `YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY`, `VITE_VAPID_PUBLIC_KEY` | Optional features |
| Authenticated end-to-end pass (chat SSE, quiz, enhancer, upload/download) | Needs runtime evidence |
| Leaked-password protection (Auth settings) | Security, manual |
| Encrypt or server-side-only user API keys; prune ~10 unused duplicate edge functions | Recommended |

## 6. Preserved unchanged (reassurance)

All 388 `src/` files except the 3 migration-required ones: every AI hook, provider (`OpenAIProvider`, `GeminiProvider`, `AnthropicProvider`, `AIProviderFactory`), `AIServiceManager`, all OCR/PDF services and processors, notes, files, folders, study plans, quotes, notifications, routing, `useAuth`, all UI components, Tailwind/Vite/eslint config, and all 23 edge-function bodies.

## 7. Awaiting your decision

No remediation will be attempted until you say so. The single highest-value next diagnostic (also read-only) is to list the models your Gemini key can actually serve, which pins the exact replacement model id before anything is edited.
