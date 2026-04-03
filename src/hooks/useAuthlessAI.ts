import { useState, useEffect } from 'react';
import { AIProvider, AIProviderConfig } from '@/features/ai/types/providers';
import { AIProviderFactory } from '@/features/ai/providers/AIProviderFactory';
import { logger } from '@/features/ai/utils/DebugLogger';

interface UseAuthlessAIResult {
  selectedProvider: AIProvider | null;
  availableProviders: AIProvider[];
  switchProvider: (provider: AIProvider) => void;
  setApiKey: (provider: AIProvider, apiKey: string) => void;
  hasValidConfig: boolean;
  generateResponse: (prompt: string) => Promise<{ content: string; error?: string }>;
}

/**
 * Hook for using AI providers without authentication
 * Stores API keys in localStorage for demo/testing purposes
 */
export const useAuthlessAI = (): UseAuthlessAIResult => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    openai: '',
    gemini: '',
    anthropic: ''
  });

  const availableProviders = AIProviderFactory.getSupportedProviders();

  useEffect(() => {
    // Load from localStorage on mount
    const savedProvider = localStorage.getItem('ai-provider') as AIProvider;
    const savedKeys = localStorage.getItem('ai-keys');
    
    if (savedProvider && availableProviders.includes(savedProvider)) {
      setSelectedProvider(savedProvider);
    }
    
    if (savedKeys) {
      try {
        const keys = JSON.parse(savedKeys);
        setApiKeys(prev => ({ ...prev, ...keys }));
      } catch (error) {
        logger.error('useAuthlessAI', 'Failed to parse saved API keys', error);
      }
    }
  }, []);

  const switchProvider = (provider: AIProvider) => {
    setSelectedProvider(provider);
    localStorage.setItem('ai-provider', provider);
    logger.info('useAuthlessAI', `Switched to provider: ${provider}`);
  };

  const setApiKey = (provider: AIProvider, apiKey: string) => {
    const newKeys = { ...apiKeys, [provider]: apiKey };
    setApiKeys(newKeys);
    localStorage.setItem('ai-keys', JSON.stringify(newKeys));
    logger.info('useAuthlessAI', `API key set for provider: ${provider}`);
  };

  const hasValidConfig = selectedProvider !== null && !!apiKeys[selectedProvider];

  const generateResponse = async (prompt: string): Promise<{ content: string; error?: string }> => {
    if (!selectedProvider) {
      return { content: '', error: 'No provider selected' };
    }

    if (!apiKeys[selectedProvider]) {
      return { content: '', error: 'No API key configured for selected provider' };
    }

    try {
      const config: AIProviderConfig = {
        provider: selectedProvider,
        model: AIProviderFactory.getDefaultModels()[selectedProvider],
        apiKey: apiKeys[selectedProvider]
      };

      const provider = AIProviderFactory.createProvider(config);
      const result = await provider.generateResponse({ prompt });
      
      return { content: result.content };
    } catch (error) {
      logger.error('useAuthlessAI', 'Failed to generate response', error);
      return { 
        content: '', 
        error: error instanceof Error ? error.message : 'Failed to generate response' 
      };
    }
  };

  return {
    selectedProvider,
    availableProviders,
    switchProvider,
    setApiKey,
    hasValidConfig,
    generateResponse
  };
};