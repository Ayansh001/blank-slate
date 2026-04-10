import { AIProvider, AIProviderConfig, AIProviderInterface } from '../types/providers';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';

export class AIProviderFactory {
  static createProvider(config: AIProviderConfig): AIProviderInterface {
    const normalizedConfig = config.provider === 'gemini'
      ? { ...config, model: 'gemini-pro' }
      : config;

    switch (normalizedConfig.provider) {
      case 'openai':
        return new OpenAIProvider(normalizedConfig);
      case 'gemini':
        return new GeminiProvider(normalizedConfig);
      case 'anthropic':
        return new AnthropicProvider(normalizedConfig);
      default:
        throw new Error(`Unsupported AI provider: ${normalizedConfig.provider}`);
    }
  }

  static getSupportedProviders(): AIProvider[] {
    return ['openai', 'gemini', 'anthropic'];
  }

  static getDefaultModels(): Record<AIProvider, string> {
    return {
      openai: 'gpt-4o-mini',
      gemini: 'gemini-pro',
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