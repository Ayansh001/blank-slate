
Diagnosis

- The screen in your screenshot is coming from `src/components/ai/OpenAIKeyManager.tsx`; the exact red card text and toast text match that file.
- OpenAI and Gemini are both affected by the same main problem: the app has multiple separate AI configuration/validation flows, and they do not agree with each other.
- Current config paths are split across:
  - `UnifiedAIServiceSelector`
  - `AIConfigurationPanel`
  - `SimpleServiceSelector`
  - `OpenAIKeyManager`
- Because of that, one part of the app can say “connected” while another says “wrong API key”.

Main root causes I found

1. Shared root cause for both OpenAI and Gemini
- `AIServiceManager.testAPIKey()` does hard validation with direct browser calls to model-listing endpoints.
- That validation path is not the same path used later by actual features like quiz, enhancer, concept learner, and chat.
- So a key can be valid for real usage but still get rejected during the “save/check” step.

2. OpenAI-specific extra bug
- `OpenAIConceptLearningService.testConnection()` calls `getApiKey()` without `userId`.
- That means saved/backend config can be skipped, and the concept learner can fall back to stale or empty local storage.
- `OpenAIKeyManager.testExistingConnection(key)` also ignores the `key` argument entirely.
- Result: Learn page can show “Not connected” even when OpenAI is already configured elsewhere.

3. Gemini-specific extra bug
- `AIServiceManager.validateAPIKey()` only accepts Gemini keys starting with `AIzaSy`.
- That is too strict. The validator should accept standard Google API key format more broadly (`AIza...`).
- So Gemini can be rejected before it is even saved.

4. Duplicate UI problem
- `src/pages/Settings.tsx` renders both `UnifiedAIServiceSelector` and `AIConfigurationPanel`.
- Those two screens can validate, save, and display status differently.
- `src/pages/AIChat.tsx` also has a third setup flow via `SimpleServiceSelector`.

Implementation plan

1. Unify AI config into one resolved source
- Create one shared resolver/hook that returns the active AI config:
  - `provider`
  - `model`
  - `apiKey`
  - `source`
- Make chat, quiz, note enhancer, file enhancer, and concept learner all read from that one resolver.
- Remove feature-level direct localStorage/config lookup logic.

2. Fix validation logic so it matches real usage
- Replace strict pre-save validation with provider-aware rules:
  - OpenAI: accept `sk-...` including project keys
  - Gemini: accept `AIza...`
- Change “test connection” to use the same provider execution path used by actual features, not a separate model-listing precheck.
- Surface exact provider errors instead of generic “wrong API key”.

3. Fix the OpenAI concept learner bug
- Refactor `OpenAIKeyManager` and `OpenAIConceptLearningService` so connection testing uses the actually selected key source.
- Pass `userId` when checking saved configs, or remove this custom service and reuse the shared resolver.
- Recalculate connection state when local override is toggled.
- Stop false “Not connected” states from blocking the Learn button.

4. Remove duplicate setup components
- In `Settings.tsx`, keep only one AI configuration UI.
- In `AIChat.tsx`, reuse the same shared config/status component instead of `SimpleServiceSelector`.
- In `EnhancedConceptLearner`, stop using separate OpenAI-only connection logic for gating.

5. Align all AI features to the same config path
- Verify and update these to use the same resolved config:
  - `useEnhancedChat`
  - `SimpleQuizGenerator`
  - `SimpleNoteEnhancer`
  - `SimpleFileEnhancer`
  - `useConceptLearner`

Files to update

- `src/features/ai/services/AIServiceManager.ts`
- `src/features/ai/hooks/useAIConfig.ts`
- `src/components/ai/OpenAIKeyManager.tsx`
- `src/services/OpenAIConceptLearningService.ts`
- `src/features/concept-learner/components/EnhancedConceptLearner.tsx`
- `src/features/concept-learner/hooks/useConceptLearner.ts`
- `src/components/ai/AIConfigurationPanel.tsx`
- `src/features/ai/components/UnifiedAIServiceSelector.tsx`
- `src/features/ai/components/SimpleServiceSelector.tsx`
- `src/pages/Settings.tsx`
- `src/pages/AIChat.tsx`

Technical details

```text
Current broken flow
Settings -> validator A
AI Chat -> validator B
Learn page -> OpenAI local-storage checker
Features -> mixed config readers

Target flow
One resolved AI config -> one validation strategy -> all AI features use the same provider/model/key
```

- No database schema change is required. `ai_service_configs` already has the needed fields.
- The screenshot issue is not mainly quota-related. It is primarily a broken connection-status/validation architecture.

QA after implementation

- Save a new OpenAI key in Settings and confirm the same status appears in Settings, AI Chat, and Learn.
- Save a new Gemini key and confirm it is not rejected by the old overly strict prefix rule.
- Test end-to-end:
  - AI chat
  - concept learner
  - quiz generator
  - note enhancer
  - file enhancer
- Recheck on mobile viewport so no page shows conflicting “connected / not connected” states.
