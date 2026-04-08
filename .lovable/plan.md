

## Structured Diagnostic Report

### Function Called
- **Concept Learner**: `useConceptLearner.ts` calls `AIProviderFactory.createProvider()` directly (client-side) when `activeConfig` has an `api_key`. Falls back to edge functions `openai-concept-learner-v2` or `gemini-concept-learner-v2` only when no local config exists.
- **Chat**: `useEnhancedChat.ts` calls edge functions `openai-simple-chat` or `ai-gemini-chat`, passing `configData.api_key` in the request body.
- **Quiz/Enhancer**: `SimpleQuizGenerator.tsx` and `SimpleNoteEnhancer.tsx` call `AIProviderFactory.createProvider()` directly (client-side).

### Auth Status
- Chat: reads config via `supabase.from('ai_service_configs').select('*').eq('user_id', user.id).eq('is_active', true).single()` -- works correctly.
- Concept Learner: uses `useAIConfig()` hook which does the same query via `AIServiceManager.getUserAIConfigs()` -- works correctly.

### Config Found
- DB table `ai_service_configs` has columns: `api_key`, `service_name`, `model_name`, `is_active`, `user_id`.
- There is **NO** column called `api_key_encrypted` in the database.

### DB API Key Present
- The `api_key` column exists and is used by the frontend correctly.

### Env Key Present
- Edge functions try `Deno.env.get('OPENAI_API_KEY')` and `Deno.env.get('GEMINI_API_KEY')` -- these are likely NOT set as Supabase secrets.

---

### FAILURE POINTS FOUND

#### Failure Point 1: Edge function `concept-learner-handler` references `api_key_encrypted` (non-existent column)
- **File**: `supabase/functions/concept-learner-handler/index.ts`, line 79-82
- **Code**: `configData.api_key_encrypted` -- this column does NOT exist in the DB
- **Impact**: When concept learner falls back to edge function path, it gets `undefined` for the API key and fails with "API key not configured"
- **Note**: Currently the frontend concept learner uses client-side calls (not this edge function) when `activeConfig.api_key` exists, so this only fails if the config query returns no `api_key`.

#### Failure Point 2: Chat edge functions receive API key correctly
- **File**: `src/features/ai/hooks/useEnhancedChat.ts`, lines 191, 205, 219
- **Code**: `apiKey: configData.api_key` -- this IS correct
- **Edge functions** `openai-simple-chat` and `ai-gemini-chat` accept `apiKey` from the request body -- this works
- **Status**: Chat path is architecturally correct

#### Failure Point 3: `useAIProvider.ts` line 54 uses `.single()` instead of `.maybeSingle()`
- **File**: `src/features/ai/hooks/useAIProvider.ts`, line 54
- **Impact**: If no active config exists, `.single()` throws a PostgREST error (PGRST116) instead of returning null gracefully. The error is caught on line 57 but only for that specific code -- other consumers may not handle it.

#### Failure Point 4: `useAIProvider.ts` `getProviderConfig` also uses `.single()` (line 124)
- Same issue as above.

#### Failure Point 5: RLS may block `api_key` from being returned
- The `ai_service_configs` table stores raw API keys. If RLS policies restrict which columns are visible, `api_key` could come back as `null` even when stored.
- Need to verify: does the frontend actually receive `api_key` when querying? The `useAIConfig` hook logs nothing about this.

#### Failure Point 6: Six edge functions still reference `api_key_encrypted`
- `concept-learner-handler`, `ai-chat-handler`, `ai-quiz-generator`, `ai-note-enhancer`, `ai-smart-organizer`, `ai-content-analyzer`
- All read `configData.api_key_encrypted` which does not exist, so they always get `undefined`

---

### Fix Required

**Step 1: Fix all edge functions referencing `api_key_encrypted` → `api_key`**

Update these 6 edge functions to use `configData.api_key` instead of `configData.api_key_encrypted`:
- `supabase/functions/concept-learner-handler/index.ts` (lines 79, 81)
- `supabase/functions/ai-chat-handler/index.ts` (lines 111, 113)
- `supabase/functions/ai-quiz-generator/index.ts` (lines 136, 138)
- `supabase/functions/ai-note-enhancer/index.ts` (lines 102-104, 120, 122)
- `supabase/functions/ai-smart-organizer/index.ts` (line 94)
- `supabase/functions/ai-content-analyzer/index.ts` (line 154)

**Step 2: Fix `.single()` calls in `useAIProvider.ts`**

Change lines 54 and 124 from `.single()` to `.maybeSingle()` to prevent PostgREST errors when no active config exists.

**Step 3: Add diagnostic logging to `useAIConfig`**

Add a `console.log` when `activeConfig` is resolved so we can confirm `api_key` is actually returned from the DB (not blocked by RLS).

**Step 4: Verify client-side concept learner path**

The `useConceptLearner.ts` client-side path (lines 89-123) is architecturally correct -- it reads `activeConfig.api_key` and passes it to `AIProviderFactory.createProvider()`. The only way this fails is if `api_key` is null/empty coming from the DB query.

### Summary

The single exact root cause is: **6 edge functions reference a non-existent column `api_key_encrypted`** instead of the actual column `api_key`. This causes all edge-function-based AI features to fail with "API key not configured" even when a valid key is stored. The client-side direct API paths (quiz, enhancer, concept learner) work correctly IF `api_key` is returned from the DB -- the secondary issue is `.single()` vs `.maybeSingle()` in `useAIProvider.ts` which can cause cascading errors.

