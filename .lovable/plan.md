

## Full System Recheck Report

### Step 1 — DB Schema: PASS
- Table `ai_service_configs` has columns: `api_key`, `service_name`, `model_name`, `is_active`, `user_id`
- `api_key_encrypted` exists ONLY in migration history (renamed to `api_key`), NOT in any runtime code
- Zero matches for `api_key_encrypted` in `supabase/functions/`

### Step 2 — DB → Frontend Flow: PASS
Console logs confirm:
```
AI Config active: { provider: "openai", hasApiKey: true, keyPrefix: "sk-proj-...", isActive: true }
```
- `activeConfig` exists
- `activeConfig.api_key` is NOT null
- RLS is not blocking the key

### Step 3 — RLS Policies: PASS
The diagnostic log proves `api_key` is returned to the frontend. If RLS blocked it, `hasApiKey` would be `false`.

### Step 4 — Execution Path Classification

| Feature | Path | File |
|---------|------|------|
| Concept Learner | CLIENT (AIProviderFactory) when config exists, BACKEND fallback to edge fn | `useConceptLearner.ts` |
| Chat | BACKEND (edge function: `openai-simple-chat` / `ai-gemini-chat`) | `useEnhancedChat.ts` |
| Quiz | CLIENT (AIProviderFactory) | `SimpleQuizGenerator.tsx` |
| Note Enhancer | CLIENT (AIProviderFactory) | `SimpleNoteEnhancer.tsx` |
| File Enhancer | CLIENT (AIProviderFactory) | `SimpleFileEnhancer.tsx` |

### Step 5 — API Key Usage Per Path: PASS (with one issue)

**CLIENT PATH**: All client-side features read `activeConfig.api_key` and pass it to `AIProviderFactory.createProvider()`. This is correct and verified working.

**BACKEND PATH (Chat)**: `useEnhancedChat.ts` line 191/205/219 passes `configData.api_key` to edge functions. Edge functions (`openai-simple-chat`, `ai-gemini-chat`) accept `apiKey` from request body. This is correct.

**REMAINING ISSUE**: `useEnhancedChat.ts` line 176 still uses `.single()` instead of `.maybeSingle()`. If user has zero active configs, this throws a PostgREST error instead of returning null gracefully. The error message would be a cryptic database error rather than "AI service not configured."

### Step 6 — Edge Function Column References: PASS
All 6 previously-broken edge functions now correctly use `api_key` (not `api_key_encrypted`). Verified via search.

### Step 7 — No Mixed Architecture Issues: PASS
Each feature uses exactly one path. Concept learner has a clean fallback: client-side first, edge function only if no local config.

### Step 8 — Remaining Issues Found

**Issue 1: `useEnhancedChat.ts` line 176 — `.single()` not yet fixed**
- **File**: `src/features/ai/hooks/useEnhancedChat.ts`, line 176
- **Code**: `.single()` should be `.maybeSingle()`
- **Impact**: If no active config exists, chat crashes with PostgREST error instead of showing "please configure" message
- **Severity**: Medium — only affects users with no active config

**Issue 2: Chat sends API key in request body over the network**
- **File**: `src/features/ai/hooks/useEnhancedChat.ts`, lines 191, 205, 219
- **Code**: `apiKey: configData.api_key` sent in POST body to edge function
- **Impact**: Security concern — API key travels from browser → Supabase edge function. The edge function already has access to the DB via service role key, so it could read the key itself.
- **Severity**: Low (edge functions are HTTPS, but it's an unnecessary exposure)

### Step 9 — Conclusion

The system is architecturally correct now. The previous fixes (removing `api_key_encrypted`, fixing `.single()` in `useAIProvider.ts`, unifying config) are all in place and verified working.

**One remaining fix needed:**

1. `src/features/ai/hooks/useEnhancedChat.ts` line 176: Change `.single()` → `.maybeSingle()` to prevent chat crashes when no config exists

### Implementation

Single file change — replace `.single()` with `.maybeSingle()` on line 176 of `src/features/ai/hooks/useEnhancedChat.ts`.

Everything else is verified working:
- DB schema correct
- Frontend reads `api_key` successfully (proven by console log)
- Edge functions use correct column name
- Client-side providers receive valid API key
- No mixed architecture conflicts

