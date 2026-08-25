
import { AIProvider, AIProviderConfig } from '../types/providers';
import { AIProviderFactory } from '../providers/AIProviderFactory';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class AIProviderValidator {
  static validateConfig(config: AIProviderConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!config.provider) {
      errors.push('AI provider is required');
    } else if (!AIProviderFactory.getSupportedProviders().includes(config.provider)) {
      errors.push(`Unsupported AI provider: ${config.provider}`);
    }

    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API key is required');
    }

    if (!config.model || config.model.trim() === '') {
      warnings.push('Model not specified, will use default');
    }

    // Provider-specific validation
    if (config.provider === 'openai' && config.apiKey) {
      if (!config.apiKey.startsWith('sk-')) {
        warnings.push('OpenAI API key should start with "sk-"');
      }
    }

    if (config.provider === 'gemini' && config.apiKey) {
      if (config.apiKey.length < 30) {
        warnings.push('Gemini API key seems too short');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static async testConnection(config: AIProviderConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const provider = AIProviderFactory.createProvider(config);
      const isConnected = await provider.validateConnection();
      
      if (!isConnected) {
        errors.push('Failed to connect to AI provider');
      }
    } catch (error) {
      errors.push(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateBeforeGeneration(config: AIProviderConfig | null): ValidationResult {
    if (!config) {
      return {
        isValid: false,
        errors: ['No AI provider configuration available'],
        warnings: []
      };
    }

    const configValidation = this.validateConfig(config);
    if (!configValidation.isValid) {
      return configValidation;
    }

    return {
      isValid: true,
      errors: [],
      warnings: configValidation.warnings
    };
  }
}
