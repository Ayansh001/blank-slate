// AI Configuration Hook - Manages user AI service settings
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AIServiceConfig, AIServiceProvider } from '../types';
import { AIServiceManager } from '../services/AIServiceManager';
import { AIErrorHandler } from '../services/AIErrorHandler';
import { aiUsageTracker } from '../services/AIUsageTracker';
import { toast } from 'sonner';

export function useAIConfig() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const aiServiceManager = AIServiceManager.getInstance();

  const { data: configs = [], isLoading, error } = useQuery({
    queryKey: ['ai-configs', user?.id],
    queryFn: () => aiServiceManager.getUserAIConfigs(user?.id || ''),
    enabled: !!user
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (config: Partial<AIServiceConfig>) => {
      if (!user) throw new Error('User not authenticated');
      return aiServiceManager.saveAIConfig({ ...config, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configs'] });
      toast.success('AI service connected successfully');
    },
    onError: (error) => {
      AIErrorHandler.handle(error, 'AI config save');
    }
  });

  const testAPIKey = async (provider: AIServiceProvider, apiKey: string): Promise<boolean> => {
    // Skip validation for empty/null keys
    if (!apiKey || apiKey.trim() === '') {
      return false;
    }

    // Skip testing for existing encrypted keys (they start with specific patterns)
    if (apiKey.length > 100 || apiKey.includes('encrypted') || apiKey.startsWith('gAAAAA')) {
      console.log('Skipping validation for encrypted/stored API key');
      return true;
    }

    try {
      // Only test if it's a new key (not already encrypted/stored)
      const result = await aiServiceManager.testAPIKey(provider, apiKey);
      
      // Track API key validation
      if (user) {
        aiUsageTracker.track({
          tokensUsed: 1, // Minimal usage for validation
          operationType: 'api_key_validation',
          serviceName: provider
        });
      }
      
      return result;
    } catch (error) {
      console.error('API key validation error:', error);
      AIErrorHandler.handle(error, 'API key validation');
      return false;
    }
  };

  const activeConfig = configs.find(config => config.is_active);
  const serviceCapabilities = aiServiceManager.getAllServiceCapabilities();

  const validateAPIKey = (provider: AIServiceProvider, apiKey: string): boolean => {
    return aiServiceManager.validateAPIKey(provider, apiKey);
  };

  const setActiveService = async (serviceConfig: Partial<AIServiceConfig>) => {
    if (serviceConfig.is_active) {
      // Deactivate all current configs first when activating a service
      for (const config of configs) {
        if (config.is_active && config.id !== serviceConfig.id) {
          await saveConfigMutation.mutateAsync({
            ...config,
            is_active: false
          });
        }
      }
    }

    // Update the service configuration
    await saveConfigMutation.mutateAsync(serviceConfig);
  };

  const toggleService = async (serviceId: string, enabled: boolean) => {
    const config = configs.find(c => c.id === serviceId);
    if (!config) return;

    if (enabled) {
      // When enabling, deactivate others first
      for (const otherConfig of configs) {
        if (otherConfig.is_active && otherConfig.id !== serviceId) {
          await saveConfigMutation.mutateAsync({
            ...otherConfig,
            is_active: false
          });
        }
      }
    }

    // Toggle the target service
    await saveConfigMutation.mutateAsync({
      ...config,
      is_active: enabled
    });
  };

  return {
    configs,
    activeConfig,
    serviceCapabilities,
    isLoading,
    error,
    saveConfig: saveConfigMutation.mutate,
    setActiveService,
    toggleService,
    validateAPIKey,
    testAPIKey,
    isSaving: saveConfigMutation.isPending
  };
}