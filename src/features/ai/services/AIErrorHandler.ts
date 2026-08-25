import { toast } from 'sonner';
import { NotificationService } from '@/services/NotificationService';

// Global notification callback for rate limits
let rateLimitNotificationCallback: ((serviceName: string) => void) | null = null;

export const setRateLimitNotificationCallback = (callback: (serviceName: string) => void) => {
  rateLimitNotificationCallback = callback;
};

export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIErrorHandler {
  static handle(error: unknown, context?: string): void {
    console.error(`AI Error ${context ? `in ${context}` : ''}:`, error);
    
    if (error instanceof AIError) {
      this.handleAIError(error);
    } else if (error instanceof Error) {
      this.handleGenericError(error, context);
    } else {
      this.handleUnknownError(error, context);
    }
  }

  private static handleAIError(error: AIError): void {
    switch (error.code) {
      case 'NO_API_KEY':
        toast.error('AI service not configured. Please check your settings.');
        NotificationService.create('api_quota', {
          title: 'AI Service Configuration Required',
          message: 'Please configure your AI service API keys in settings to continue.',
          priority: 'high',
          data: { service: 'general', action: 'configure' }
        });
        break;
      case 'RATE_LIMIT':
        toast.error('Rate limit exceeded. Please update your API key in settings.');
        NotificationService.create('api_quota', {
          title: 'Rate Limit Exceeded',
          message: 'Your AI service rate limit has been exceeded. Please check your API key in settings.',
          priority: 'urgent',
          data: { service: 'openai', action: 'update_key' }
        });
        // Trigger legacy callback if available
        if (rateLimitNotificationCallback) {
          rateLimitNotificationCallback('openai');
        }
        break;
      case 'INVALID_REQUEST':
        toast.error('Invalid request format. Please try again.');
        NotificationService.systemAlert('Invalid AI request format. Please try again.', 'warning');
        break;
      case 'SERVICE_UNAVAILABLE':
        toast.error('AI service is temporarily unavailable. Please try again later.');
        NotificationService.create('system_alert', {
          title: 'AI Service Unavailable',
          message: 'The AI service is temporarily unavailable. Please try again later.',
          priority: 'high',
          data: { service: 'ai', severity: 'warning' }
        });
        break;
      case 'QUOTA_EXCEEDED':
        toast.error('Usage quota exceeded. Please update your API key in settings.');
        NotificationService.create('api_quota', {
          title: 'Usage Quota Exceeded',
          message: 'Your AI service usage quota has been exceeded. Please update your API key in settings.',
          priority: 'urgent',
          data: { service: 'openai', action: 'update_key' }
        });
        // Trigger legacy callback if available
        if (rateLimitNotificationCallback) {
          rateLimitNotificationCallback('openai');
        }
        break;
      default:
        toast.error(`AI Error: ${error.message}`);
        NotificationService.systemAlert(`AI Error: ${error.message}`, 'error');
    }
  }

  private static handleGenericError(error: Error, context?: string): void {
    if (error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection.');
      NotificationService.systemAlert('Network error detected. Please check your internet connection.', 'warning');
    } else if (error.message.includes('authentication')) {
      toast.error('Authentication failed. Please login again.');
      NotificationService.systemAlert('Authentication failed. Please login again.', 'error');
    } else if (error.message.includes('timeout')) {
      toast.error('Request timed out. Please try again.');
      NotificationService.systemAlert('Request timed out. Please try again.', 'warning');
    } else {
      const message = `Error ${context ? `in ${context}` : ''}: ${error.message}`;
      toast.error(message);
      NotificationService.systemAlert(message, 'error');
    }
  }

  private static handleUnknownError(error: unknown, context?: string): void {
    const message = `Unexpected error ${context ? `in ${context}` : ''}. Please try again.`;
    toast.error(message);
    NotificationService.systemAlert(message, 'error');
  }

  static createFromAPIResponse(response: Response, data?: any): AIError {
    if (response.status === 401) {
      return new AIError('Authentication failed', 'NO_API_KEY', data);
    } else if (response.status === 429) {
      return new AIError('Rate limit exceeded', 'RATE_LIMIT', data);
    } else if (response.status === 400) {
      return new AIError('Invalid request', 'INVALID_REQUEST', data);
    } else if (response.status >= 500) {
      return new AIError('Service unavailable', 'SERVICE_UNAVAILABLE', data);
    } else {
      return new AIError(`HTTP ${response.status}: ${response.statusText}`, 'API_ERROR', data);
    }
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          this.handle(lastError, context);
          throw lastError;
        }

        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
