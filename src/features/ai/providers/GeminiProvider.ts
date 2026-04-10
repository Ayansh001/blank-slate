
import { BaseAIProvider } from './BaseAIProvider';
import { AIResponse, GenerateOptions } from '../types/providers';

export class GeminiProvider extends BaseAIProvider {
  async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    this.validateApiKey();
    this.validateRequest(options);

    const model = this.config.model || 'gemini-1.5-flash';
    console.log('Using Gemini model:', model);

    console.log('[AI DEBUG]', {
      provider: 'gemini',
      model,
      keyPrefix: this.config.apiKey?.slice(0, 6),
    });

    return this.retryableRequest(async () => {
      const prompt = options.systemPrompt
        ? `${options.systemPrompt}\n\nUser: ${options.prompt}`
        : options.prompt;

      console.log('[Gemini] Request', {
        model,
        hasKey: !!this.config.apiKey,
        promptLength: options.prompt.length,
      });

      const { signal, clear } = this.createAbortController(10000);
      const modelsToTry = [model];

      let lastError: any = null;
      try {
        for (const modelToUse of modelsToTry) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.config.apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: options.temperature || 0.7,
                    maxOutputTokens: options.maxTokens || 2000,
                  },
                }),
                signal,
              }
            );

            console.log('[Gemini] Response status', response.status, 'model:', modelToUse);

            if (response.status === 404) {
              const raw = await response.text();
              console.warn(`[Gemini] Model ${modelToUse} not found, trying fallback...`);
              lastError = this.createClassifiedError(`Model ${modelToUse} not found`, 'provider_error', 404, raw);
              continue;
            }

            if (!response.ok) {
              const raw = await response.text();
              console.error('[Gemini] Error raw response', { status: response.status, raw });
              const code = this.classifyError(response.status, raw);
              let message = `Gemini API error (${response.status})`;
              try {
                const parsed = JSON.parse(raw);
                message = parsed.error?.message || message;
              } catch { /* use default */ }
              throw this.createClassifiedError(message, code, response.status, raw);
            }

            const raw = await response.text();
            let data: any;
            try {
              data = JSON.parse(raw);
            } catch {
              console.error('[Gemini] Invalid JSON response', raw);
              throw this.createClassifiedError('Invalid JSON response from Gemini', 'provider_error', response.status, raw);
            }

            const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content || !content.trim()) {
              throw this.createClassifiedError('Gemini returned empty response', 'provider_error', response.status, raw);
            }

            return {
              content,
              usage: {
                tokens: data.usageMetadata?.totalTokenCount || 0,
              },
            };
          } catch (error: any) {
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
              throw this.createClassifiedError('Request timed out — please try again', 'network_error');
            }
            if (error.message?.includes('Failed to fetch')) {
              throw this.createClassifiedError('Network error — check your internet connection', 'network_error');
            }
            if (error.code === 'provider_error' && error.status === 404) {
              lastError = error;
              continue;
            }
            throw error;
          }
        }
        throw lastError || this.createClassifiedError('All Gemini model fallbacks exhausted', 'provider_error');
      } finally {
        clear();
      }
    });
  }

  async generateQuiz(content: string): Promise<AIResponse> {
    const prompt = `Create a multiple choice quiz based on the following content. Return only valid JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]}. Content: ${content}`;

    return this.generateResponse({
      prompt,
      systemPrompt: 'You are an expert educator who creates high-quality, educational quizzes. Return only valid JSON format as specified.',
      maxTokens: 3000,
      temperature: 0.7,
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.generateResponse({
        prompt: 'Hello',
        maxTokens: 10,
      });
      return !!response.content;
    } catch {
      return false;
    }
  }

  getCapabilities(): string[] {
    return ['text_generation', 'quiz_generation', 'note_enhancement', 'chat_support', 'content_analysis'];
  }
}
