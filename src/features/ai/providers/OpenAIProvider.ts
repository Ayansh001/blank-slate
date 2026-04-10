
import { BaseAIProvider } from './BaseAIProvider';
import { AIResponse, GenerateOptions } from '../types/providers';

export class OpenAIProvider extends BaseAIProvider {
  async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    this.validateApiKey();
    this.validateRequest(options);

    // Model validation
    const allowedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    if (!allowedModels.includes(this.config.model)) {
      throw this.createClassifiedError(
        `Invalid model selected: ${this.config.model}`,
        'bad_request'
      );
    }

    console.log('[AI DEBUG]', {
      provider: 'openai',
      model: this.config.model,
      keyPrefix: this.config.apiKey?.slice(0, 6),
    });

    return this.retryableRequest(async () => {
      const messages: Array<{ role: string; content: string }> = [];

      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: options.prompt });

      console.log('[OpenAI] Request', {
        model: this.config.model,
        hasKey: !!this.config.apiKey,
        promptLength: options.prompt.length,
      });

      const { signal, clear } = this.createAbortController(10000);

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
          }),
          signal,
        });

        console.log('[OpenAI] Response status', response.status);

        if (!response.ok) {
          const raw = await response.text();
          console.error('[OpenAI] Error raw response', { status: response.status, raw });
          const code = this.classifyError(response.status, raw);

          // Try to extract a readable message from the raw response
          let message = `OpenAI API error (${response.status})`;
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
          console.error('[OpenAI] Invalid JSON response', raw);
          throw this.createClassifiedError('Invalid JSON response from OpenAI', 'provider_error', response.status, raw);
        }

        const content = data?.choices?.[0]?.message?.content;
        if (!content || !content.trim()) {
          throw this.createClassifiedError('OpenAI returned empty response', 'provider_error', response.status, raw);
        }

        return {
          content,
          usage: {
            tokens: data.usage?.total_tokens || 0,
            cost: this.calculateCost(data.usage?.total_tokens || 0),
          },
        };
      } catch (error: any) {
        // Classify network/abort errors
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
    const prompt = `Create a multiple choice quiz based on the following content. Return only valid JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]}. Content: ${content}`;

    return this.generateResponse({
      prompt,
      systemPrompt: 'You are an expert educator who creates high-quality, educational quizzes. Return only valid JSON format as specified.',
      maxTokens: 3000,
      temperature: 0.7,
    });
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

  private calculateCost(tokens: number): number {
    const costPer1000Tokens = 0.002;
    return (tokens / 1000) * costPer1000Tokens;
  }
}
