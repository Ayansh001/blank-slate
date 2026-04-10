
import { AIProviderInterface, AIResponse, GenerateOptions, QuizGenerationOptions, AIProviderConfig, EnhancementResult } from '../types/providers';
import { logger } from '../utils/DebugLogger';

export interface AIError extends Error {
  code: string;
  status?: number;
  rawResponse?: string;
}

export abstract class BaseAIProvider implements AIProviderInterface {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract generateResponse(options: GenerateOptions): Promise<AIResponse>;
  abstract validateConnection(): Promise<boolean>;
  abstract getCapabilities(): string[];

  // --- Shared utilities ---

  protected classifyError(status: number, rawBody: string): string {
    const lower = rawBody.toLowerCase();

    // 401 can mean multiple things — check body first
    if (status === 401 || status === 403) {
      if (lower.includes('quota') || lower.includes('billing') || lower.includes('exceeded')) {
        return 'quota_exceeded';
      }
      if (lower.includes('organization')) return 'config_error';
      if (
        lower.includes('incorrect_api_key') ||
        lower.includes('invalid api key') ||
        lower.includes('invalid x-goog-api-key') ||
        lower.includes('api_key_invalid')
      ) {
        return 'invalid_key';
      }
      return 'invalid_key';
    }
    if (status === 429) {
      if (lower.includes('quota')) return 'quota_exceeded';
      return 'rate_limited';
    }
    if (status === 400) return 'bad_request';
    if (status >= 500) return 'provider_error';

    // Network-level errors (no HTTP status)
    if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('aborted') || lower.includes('timeout')) {
      return 'network_error';
    }

    return 'unknown_error';
  }

  protected createClassifiedError(message: string, code: string, status?: number, rawResponse?: string): AIError {
    const err = new Error(message) as AIError;
    err.code = code;
    err.status = status;
    err.rawResponse = rawResponse;
    return err;
  }

  protected async retryableRequest<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const code = error.code || this.classifyError(0, error.message || '');
        // Do NOT retry on confirmed auth/config/bad request errors
        if (['invalid_key', 'bad_request', 'config_error'].includes(code)) {
          throw error;
        }
        if (attempt < maxRetries) {
          console.warn(`[AI RETRY] Attempt ${attempt + 1} failed (${code}), retrying in 1.5s...`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
    throw lastError;
  }

  protected createAbortController(timeoutMs = 10000): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      clear: () => clearTimeout(timer),
    };
  }

  protected validateRequest(options: GenerateOptions): void {
    if (!this.config.model) {
      throw this.createClassifiedError('Model is not configured', 'bad_request');
    }
    if (!options.prompt || !options.prompt.trim()) {
      throw this.createClassifiedError('Prompt cannot be empty', 'bad_request');
    }
  }

  // Fixed generateQuiz to accept content string and return AIResponse with questions
  async generateQuiz(content: string): Promise<AIResponse> {
    try {
      const response = await this.generateResponse({
        prompt: `Create a multiple choice quiz based on the following content. Return only valid JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]}. Content: ${content}`,
        maxTokens: 2000,
        temperature: 0.7,
        systemPrompt: 'You are an expert educator who creates high-quality multiple choice questions. Always return valid JSON format.'
      });

      try {
        const parsedContent = JSON.parse(response.content);
        return {
          ...response,
          questions: parsedContent.questions || parsedContent
        };
      } catch (parseError) {
        return {
          ...response,
          questions: []
        };
      }
    } catch (error) {
      logger.error('BaseAIProvider', 'Quiz generation failed', error);
      throw error;
    }
  }

  async enhanceText(content: string): Promise<string> {
    try {
      const response = await this.generateResponse({
        prompt: `Please enhance and improve the following text while maintaining its core meaning and structure:\n\n${content}`,
        maxTokens: 2000,
        temperature: 0.7,
        systemPrompt: 'You are an expert editor who improves text clarity, grammar, and structure while preserving the original meaning.'
      });
      return response.content;
    } catch (error) {
      logger.error('BaseAIProvider', 'Text enhancement failed', error);
      throw error;
    }
  }

  async generateKeyPoints(content: string): Promise<string[]> {
    try {
      const response = await this.generateResponse({
        prompt: `Extract the key points from the following content as a bulleted list:\n\n${content}`,
        maxTokens: 1000,
        temperature: 0.5,
        systemPrompt: 'You are an expert at identifying key points and important information from text. Return clear, concise bullet points.'
      });

      const keyPoints = response.content
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.trim().replace(/^[•\-\*]\s*/, ''))
        .filter(point => point.length > 0);

      return keyPoints.length > 0 ? keyPoints : [response.content];
    } catch (error) {
      logger.error('BaseAIProvider', 'Key points generation failed', error);
      throw error;
    }
  }

  async generateQuestions(content: string): Promise<string[]> {
    try {
      const response = await this.generateResponse({
        prompt: `Generate 5-10 thoughtful questions based on the following content:\n\n${content}`,
        maxTokens: 1000,
        temperature: 0.6,
        systemPrompt: 'You are an expert educator who creates insightful questions to help students think critically about content.'
      });

      const questions = response.content
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./) || line.trim().endsWith('?'))
        .map(line => line.trim().replace(/^\d+\.\s*/, ''))
        .filter(question => question.length > 0);

      return questions.length > 0 ? questions : [response.content];
    } catch (error) {
      logger.error('BaseAIProvider', 'Questions generation failed', error);
      throw error;
    }
  }

  async generateSummary(content: string): Promise<string> {
    try {
      const response = await this.generateResponse({
        prompt: `Provide a concise summary of the following content:\n\n${content}`,
        maxTokens: 500,
        temperature: 0.5,
        systemPrompt: 'You are an expert at creating clear, concise summaries that capture the essential information.'
      });
      return response.content;
    } catch (error) {
      logger.error('BaseAIProvider', 'Summary generation failed', error);
      throw error;
    }
  }

  protected validateApiKey(): void {
    // Trim whitespace from key
    if (this.config.apiKey) {
      this.config.apiKey = this.config.apiKey.trim();
    }
    if (!this.config.apiKey || this.config.apiKey === '') {
      throw this.createClassifiedError(
        `API key is required for ${this.config.provider}. Go to Settings → AI Configuration to add your key.`,
        'invalid_key'
      );
    }

    // Provider-specific format validation
    if (this.config.provider === 'openai' && !this.config.apiKey.startsWith('sk-')) {
      throw this.createClassifiedError(
        'Invalid OpenAI API key format',
        'invalid_key'
      );
    }

    if (this.config.provider === 'gemini' && this.config.apiKey.length < 20) {
      throw this.createClassifiedError(
        'Invalid Gemini API key format',
        'invalid_key'
      );
    }
  }

  protected handleError(error: any, operation: string): never {
    logger.error(`${this.constructor.name}`, `${operation} failed`, error);

    // If already classified, re-throw
    if (error.code && ['invalid_key', 'quota_exceeded', 'rate_limited', 'network_error', 'provider_error', 'bad_request', 'config_error'].includes(error.code)) {
      throw error;
    }

    const msg = error.message || '';
    // Classify from message content as fallback
    const code = this.classifyError(error.status || 0, msg);
    throw this.createClassifiedError(msg || `${operation} failed`, code, error.status);
  }
}
