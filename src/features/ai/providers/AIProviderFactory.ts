import { AIProvider, AIProviderConfig, AIProviderInterface } from '../types/providers';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';

export class AIProviderFactory {
  static createProvider(config: AIProviderConfig): AIProviderInterface {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  static getSupportedProviders(): AIProvider[] {
    return ['openai', 'gemini', 'anthropic'];
  }

  static getDefaultModels(): Record<AIProvider, string> {
    return {
      openai: 'gpt-4o-mini',
      gemini: 'gemini-1.5-flash',
      anthropic: 'claude-3-haiku-20240307',
    };
  }

  static validateConfig(config: AIProviderConfig): boolean {
    if (!config.provider || !config.apiKey) {
      return false;
    }
    
    const supportedProviders = this.getSupportedProviders();
    return supportedProviders.includes(config.provider);
  }
}