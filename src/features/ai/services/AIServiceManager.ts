// AI Service Manager - Core service abstraction layer
import { supabase } from '@/integrations/supabase/client';
import { AIServiceConfig, AIServiceProvider, AIServiceCapabilities } from '../types';

export class AIServiceManager {
  private static instance: AIServiceManager;
  private serviceCapabilities: Record<AIServiceProvider, AIServiceCapabilities> = {
    openai: {
      models: ['gpt-4o', 'gpt-4o-mini'],
      maxTokens: 128000,
      supportsVision: true,
      supportsStreaming: true,
      costPerToken: { input: 0.000005, output: 0.000015 }
    },
    anthropic: {
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
      maxTokens: 200000,
      supportsVision: true,
      supportsStreaming: true,
      costPerToken: { input: 0.000003, output: 0.000015 }
    },
    gemini: {
      models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      maxTokens: 1000000,
      supportsVision: true,
      supportsStreaming: true,
      costPerToken: { input: 0.000001, output: 0.000005 }
    }
  };

  public static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager();
    }
    return AIServiceManager.instance;
  }

  async getUserAIConfigs(userId: string): Promise<AIServiceConfig[]> {
    const { data, error } = await supabase
      .from('ai_service_configs')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data as AIServiceConfig[];
  }

  async saveAIConfig(config: Partial<AIServiceConfig>): Promise<AIServiceConfig> {
    // Delete existing config for this service first (replace, don't add)
    if (config.user_id && config.service_name) {
      await supabase
        .from('ai_service_configs')
        .delete()
        .eq('user_id', config.user_id)
        .eq('service_name', config.service_name);
    }

    const { data, error } = await supabase
      .from('ai_service_configs')
      .insert({
        user_id: config.user_id!,
        service_name: config.service_name!.toLowerCase(), // Ensure lowercase for consistency
        api_key: config.api_key,
        model_name: config.model_name,
        is_active: config.is_active
      })
      .select()
      .single();

    if (error) throw error;
    return data as AIServiceConfig;
  }

  async getActiveAIService(userId: string): Promise<AIServiceConfig | null> {
    const configs = await this.getUserAIConfigs(userId);
    return configs.find(config => config.is_active) || null;
  }

  getServiceCapabilities(provider: AIServiceProvider): AIServiceCapabilities {
    return this.serviceCapabilities[provider];
  }

  getAllServiceCapabilities(): Record<AIServiceProvider, AIServiceCapabilities> {
    return this.serviceCapabilities;
  }

  validateAPIKey(provider: AIServiceProvider, apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    switch (provider) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'anthropic':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
      case 'gemini':
        return apiKey.startsWith('AIzaSy') && apiKey.length > 30;
      default:
        return false;
    }
  }

  async testAPIKey(provider: AIServiceProvider, apiKey: string): Promise<boolean> {
    if (!this.validateAPIKey(provider, apiKey)) return false;

    try {
      switch (provider) {
        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          return openaiResponse.ok;
          
        case 'gemini':
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          return geminiResponse.ok;
          
        case 'anthropic':
          // Anthropic doesn't have a simple test endpoint, so we'll just validate format
          return true;
          
        default:
          return false;
      }
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  }

  async trackUsage(
    userId: string,
    serviceName: string,
    operationType: string,
    tokensUsed: number,
    costEstimate?: number
  ): Promise<void> {
    await supabase
      .from('ai_usage_tracking')
      .insert({
        user_id: userId,
        service_name: serviceName,
        operation_type: operationType,
        tokens_used: tokensUsed,
        cost_estimate: costEstimate,
        date: new Date().toISOString().split('T')[0]
      });
  }

  calculateCost(provider: AIServiceProvider, inputTokens: number, outputTokens: number): number {
    const capabilities = this.getServiceCapabilities(provider);
    return (inputTokens * capabilities.costPerToken.input) + 
           (outputTokens * capabilities.costPerToken.output);
  }
}