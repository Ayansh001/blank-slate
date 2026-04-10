

## Root Cause: `gemini-pro` is hardcoded EVERYWHERE

### The Problem

The model `gemini-pro` is a **deprecated/legacy model** that returns 404 from Gemini's `generateContent` endpoint. Meanwhile, `gemini-1.5-flash` works in `ListModels` because listing and generation use different model availability rules.

**Why ListModels works but generateContent fails**: `gemini-pro` may still appear in model listings but is no longer available for content generation in many regions/projects. The v1beta endpoint specifically requires newer model names like `gemini-1.5-flash`.

### Evidence

1. **Database**: `ai_service_configs` has `model_name = 'gemini-pro'` for the Gemini config
2. **Zero matches** for `gemini-1.5-flash` anywhere in the codebase
3. **141 matches** for `gemini-pro` across 22 files — all hardcoded

### Files That Force `gemini-pro` (Must ALL Change)

**Client-side providers:**
- `src/features/ai/providers/GeminiProvider.ts` (lines 10-12) — forces `gemini-pro` even if config says otherwise
- `src/features/ai/providers/AIProviderFactory.ts` (lines 8-9, 31) — overrides config to `gemini-pro`
- `src/features/ai/hooks/useEnhancedChat.ts` (line 13) — `GEMINI_MODEL = 'gemini-pro'`

**UI components (defaults/display):**
- `src/features/ai/components/SimpleServiceSelector.tsx` (line 41)
- `src/features/ai/components/UnifiedAIServiceSelector.tsx` (line 77)
- `src/features/ai/components/AIConfigValidator.tsx` (lines 31, 81, 112, 181)

**Edge functions (fallback defaults):**
- `supabase/functions/concept-learner-handler/index.ts` (line 207)
- `supabase/functions/ai-chat-handler/index.ts` (line 294)
- `supabase/functions/ai-chat-sse/index.ts` (line 287)
- `supabase/functions/ai-quiz-generator/index.ts` (lines 225, 227)
- `supabase/functions/ai-note-enhancer/index.ts` (lines 220, 222)
- `supabase/functions/ai-smart-organizer/index.ts` (line 127)
- `supabase/functions/ai-quote-generator/index.ts` (line 249)
- `supabase/functions/concept-summary-handler/index.ts` (line 39)
- `supabase/functions/enhanced-concept-learner/index.ts` (line 118)

### Fix Plan

**Step 1**: Replace ALL `gemini-pro` references with `gemini-1.5-flash` across all 22 files listed above.

**Step 2**: Remove the forced override logic in `GeminiProvider.ts` (lines 11-12 that force model back to `gemini-pro`) and `AIProviderFactory.ts` (lines 8-9 that normalize config to `gemini-pro`). Let the configured model pass through.

**Step 3**: Update the database row — set `model_name = 'gemini-1.5-flash'` for the existing Gemini config.

**Step 4**: Update `useEnhancedChat.ts` constant and normalizer to use `gemini-1.5-flash`.

### Technical Summary

Every single code path — client-side provider, edge functions, UI defaults, and the database itself — uses the deprecated `gemini-pro` model. The fix is a global find-and-replace of the default model name plus removing the forced override logic that prevents users from using any other model.

