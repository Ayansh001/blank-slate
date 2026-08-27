import { AIProvider, AIProviderConfig, AIProviderInterface } from '../types/providers';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { GroqProvider, GROQ_DEFAULT_MODEL } from './GroqProvider';

export class AIProviderFactory {
  static createProvider(config: AIProviderConfig): AIProviderInterface {
    const normalizedConfig = config;

    switch (normalizedConfig.provider) {
      case 'openai':
        return new OpenAIProvider(normalizedConfig);
      case 'gemini':
        return new GeminiProvider(normalizedConfig);
      case 'anthropic':
        return new AnthropicProvider(normalizedConfig);
      case 'groq':
        return new GroqProvider(normalizedConfig);
      default:
        throw new Error(`Unsupported AI provider: ${normalizedConfig.provider}`);
    }
  }

  static getSupportedProviders(): AIProvider[] {
    return ['openai', 'gemini', 'anthropic', 'groq'];
  }

  static getDefaultModels(): Record<AIProvider, string> {
    return {
      openai: 'gpt-4o-mini',
      gemini: 'gemini-2.5-flash',
      anthropic: 'claude-3-haiku-20240307',
      groq: GROQ_DEFAULT_MODEL,
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