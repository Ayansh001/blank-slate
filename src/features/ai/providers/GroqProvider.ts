import { BaseAIProvider } from './BaseAIProvider';
import { AIResponse, GenerateOptions } from '../types/providers';

// Groq exposes an OpenAI-compatible REST surface, but it is an independent
// provider with its own endpoint, models, keys and limits.
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

export class GroqProvider extends BaseAIProvider {
  async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    this.validateApiKey();
    this.validateRequest(options);

    const model = GROQ_MODELS.includes(this.config.model) ? this.config.model : GROQ_DEFAULT_MODEL;

    console.log('Using Groq model:', model);
    console.log('[AI DEBUG]', {
      provider: 'groq',
      model,
      keyPrefix: this.config.apiKey?.slice(0, 6),
    });

    return this.retryableRequest(async () => {
      const messages: Array<{ role: string; content: string }> = [];

      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.prompt });

      const { signal, clear } = this.createAbortController(60000);

      try {
        const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature ?? 0.7,
          }),
          signal,
        });

        console.log('[Groq] Response status', response.status);

        if (!response.ok) {
          const raw = await response.text();
          console.error('[Groq] Error raw response', { status: response.status, raw });
          const code = this.classifyError(response.status, raw);

          let message = `Groq API error (${response.status})`;
          try {
            const parsed = JSON.parse(raw);
            message = parsed.error?.message || message;
          } catch { /* use default message */ }

          throw this.createClassifiedError(message, code, response.status, raw);
        }

        const raw = await response.text();
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          console.error('[Groq] Invalid JSON response', raw);
          throw this.createClassifiedError('Invalid JSON response from Groq', 'provider_error', response.status, raw);
        }

        const content = data?.choices?.[0]?.message?.content;
        if (!content || !content.trim()) {
          throw this.createClassifiedError('Groq returned empty response', 'provider_error', response.status, raw);
        }

        return {
          content,
          usage: {
            tokens: data.usage?.total_tokens || 0,
            cost: this.calculateCost(data.usage?.total_tokens || 0),
          },
        };
      } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          throw this.createClassifiedError('Request timed out — please try again', 'network_error');
        }
        if (error.message?.includes('Failed to fetch')) {
          throw this.createClassifiedError('Network error — check your internet connection', 'network_error');
        }
        throw error;
      } finally {
        clear();
      }
    });
  }

  async generateQuiz(content: string): Promise<AIResponse> {
    const response = await this.generateResponse({
      prompt: `Create a multiple choice quiz based on the following content. Return only valid JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]}. Content: ${content}`,
      systemPrompt: 'You are an expert educator who creates high-quality, educational quizzes. Return only valid JSON format as specified.',
      maxTokens: 3000,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(response.content);
      return { ...response, questions: parsed.questions || parsed };
    } catch {
      return { ...response, questions: [] };
    }
  }

  async enhanceText(content: string): Promise<string> {
    const response = await this.generateResponse({
      prompt: `Please enhance and improve the following text while maintaining its core meaning and structure. Focus on clarity, grammar, and readability:\n\n${content}`,
      maxTokens: 2000,
      temperature: 0.7,
      systemPrompt: 'You are an expert editor who improves text clarity, grammar, and structure while preserving the original meaning and style.',
    });
    return response.content;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${GROQ_BASE_URL}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getCapabilities(): string[] {
    return ['text_generation', 'quiz_generation', 'note_enhancement', 'chat_support', 'content_analysis'];
  }

  private calculateCost(tokens: number): number {
    // llama-3.3-70b-versatile blended estimate (~$0.79/M tokens)
    return (tokens / 1000) * 0.00079;
  }
}
