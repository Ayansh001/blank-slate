import { useState, useEffect } from 'react';
import { AIProvider, AIProviderConfig } from '../types/providers';
import { AIProviderFactory } from '../providers/AIProviderFactory';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../utils/DebugLogger';

interface UseAIProviderResult {
  selectedProvider: AIProvider | null;
  availableProviders: AIProvider[];
  isLoading: boolean;
  error: string | null;
  switchProvider: (provider: AIProvider) => Promise<void>;
  getProviderConfig: () => Promise<AIProviderConfig | null>;
}

const GEMINI_MODEL = 'gemini-pro';

const normalizeProviderModel = (provider: AIProvider, model?: string | null) => {
  if (provider === 'gemini') {
    return GEMINI_MODEL;
  }

  return model || AIProviderFactory.getDefaultModels()[provider];
};

export const useAIProvider = (): UseAIProviderResult => {
  const { user } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableProviders = AIProviderFactory.getSupportedProviders();

  useEffect(() => {
    if (user) {
      loadActiveProvider();
    }
  }, [user]);

  const loadActiveProvider = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: configs, error: configError } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (configs) {
        const provider = configs.service_name as AIProvider;
        if (availableProviders.includes(provider)) {
          if (provider === 'gemini' && configs.model_name !== GEMINI_MODEL && configs.id) {
            const { error: normalizeError } = await supabase
              .from('ai_service_configs')
              .update({ model_name: GEMINI_MODEL })
              .eq('id', configs.id);

            if (normalizeError) {
              logger.warn('useAIProvider', 'Failed to normalize Gemini model in database');
            }
          }

          setSelectedProvider(provider);
          logger.info('useAIProvider', `Loaded active provider: ${provider}`);
        }
      } else {
        // Try to get user preference from localStorage
        const savedProvider = localStorage.getItem('preferred-ai-provider') as AIProvider;
        if (savedProvider && availableProviders.includes(savedProvider)) {
          setSelectedProvider(savedProvider);
        } else {
          setSelectedProvider('openai'); // Default
        }
      }
    } catch (err) {
      logger.error('useAIProvider', 'Failed to load active provider', err);
      setError(err instanceof Error ? err.message : 'Failed to load provider');
    } finally {
      setIsLoading(false);
    }
  };

  const switchProvider = async (provider: AIProvider) => {
    try {
      setIsLoading(true);
      setError(null);

      // Save preference to localStorage
      localStorage.setItem('preferred-ai-provider', provider);
      
      if (user) {
        // Deactivate all current providers
        await supabase
          .from('ai_service_configs')
          .update({ is_active: false })
          .eq('user_id', user.id);

        // Activate the selected provider if config exists
        const { error: updateError } = await supabase
          .from('ai_service_configs')
          .update(provider === 'gemini' ? { is_active: true, model_name: GEMINI_MODEL } : { is_active: true })
          .eq('user_id', user.id)
          .eq('service_name', provider);

        if (updateError) {
          logger.warn('useAIProvider', `No config found for ${provider}, will use client-side only`);
        }
      }

      setSelectedProvider(provider);
      logger.info('useAIProvider', `Switched to provider: ${provider}`);
    } catch (err) {
      logger.error('useAIProvider', 'Failed to switch provider', err);
      setError(err instanceof Error ? err.message : 'Failed to switch provider');
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderConfig = async (): Promise<AIProviderConfig | null> => {
    if (!selectedProvider || !user) {
      return null;
    }

    try {
      const { data: config } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_name', selectedProvider)
        .eq('is_active', true)
        .single();

      const apiKey = config?.api_key?.trim();
      if (config && apiKey) {
        return {
          provider: selectedProvider,
          model: normalizeProviderModel(selectedProvider, config.model_name),
          apiKey,
        };
      }

      setError('No API key configured. Go to Settings → AI Configuration to add your key.');
      return null;
    } catch (err) {
      logger.error('useAIProvider', 'Failed to get provider config', err);
      return null;
    }
  };

  return {
    selectedProvider,
    availableProviders,
    isLoading,
    error,
    switchProvider,
    getProviderConfig,
  };
};