
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { HistoryPreferenceService } from '@/features/ai/services/HistoryPreferenceService';

export interface AIHistoryPreference {
  id: string;
  user_id: string;
  feature_type: string;
  is_enabled: boolean;
  retention_days: number;
  storage_budget_mb: number;
  auto_cleanup: boolean;
  created_at: string;
  updated_at: string;
}

const FEATURE_TYPES = [
  'quiz_sessions',
  'chat_sessions', 
  'note_enhancements',
  'concept_learning',
  'document_analyses',
  'usage_tracking'
] as const;

export function useAIHistoryPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['ai-history-preferences', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from('ai_history_preferences')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.warn('AI history preferences table not available:', error.message);
          return [];
        }
        return data as AIHistoryPreference[];
      } catch (error) {
        console.warn('Error fetching AI history preferences:', error);
        return [];
      }
    },
    enabled: !!user
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ 
      featureType, 
      updates 
    }: { 
      featureType: string; 
      updates: Partial<AIHistoryPreference> 
    }) => {
      if (!user) throw new Error('User not authenticated');

      // First try to update existing record
      const { data: existingData, error: selectError } = await supabase
        .from('ai_history_preferences')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature_type', featureType)
        .single();

      if (existingData) {
        // Update existing record
        const { data, error } = await supabase
          .from('ai_history_preferences')
          .update(updates)
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('ai_history_preferences')
          .insert({
            user_id: user.id,
            feature_type: featureType,
            is_enabled: true,
            retention_days: 90,
            storage_budget_mb: 50,
            auto_cleanup: false,
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Clear service cache when preferences are updated
      if (user) {
        HistoryPreferenceService.clearUserCache(user.id);
      }
      queryClient.invalidateQueries({ queryKey: ['ai-history-preferences', user?.id] });
      toast.success('History preferences updated');
    },
    onError: (error) => {
      console.error('Preference update error:', error);
      toast.error('Failed to update preferences: ' + error.message);
    }
  });

  const toggleFeature = (featureType: string, enabled: boolean) => {
    updatePreferenceMutation.mutate({
      featureType,
      updates: { is_enabled: enabled }
    });
  };

  const updateRetention = (featureType: string, days: number) => {
    updatePreferenceMutation.mutate({
      featureType,
      updates: { retention_days: days }
    });
  };

  const toggleAutoCleanup = (featureType: string, enabled: boolean) => {
    updatePreferenceMutation.mutate({
      featureType,
      updates: { auto_cleanup: enabled }
    });
  };

  const disableAllHistory = async () => {
    if (!user) return;

    try {
      const results = await Promise.allSettled(
        FEATURE_TYPES.map(featureType =>
          updatePreferenceMutation.mutateAsync({
            featureType,
            updates: { is_enabled: false }
          })
        )
      );

      const failed = results.filter(result => result.status === 'rejected');
      if (failed.length > 0) {
        console.error('Some history disabling failed:', failed);
        toast.error(`Failed to disable ${failed.length} features`);
      } else {
        toast.success('All AI history saving disabled');
      }

      // Clear cache and refresh data
      HistoryPreferenceService.clearUserCache(user.id);
      queryClient.invalidateQueries({ queryKey: ['ai-history-preferences', user.id] });
    } catch (error) {
      console.error('Error disabling all history:', error);
      toast.error('Failed to disable all history features');
    }
  };

  const enableAllHistory = async () => {
    if (!user) return;

    try {
      const results = await Promise.allSettled(
        FEATURE_TYPES.map(featureType =>
          updatePreferenceMutation.mutateAsync({
            featureType,
            updates: { is_enabled: true }
          })
        )
      );

      const failed = results.filter(result => result.status === 'rejected');
      if (failed.length > 0) {
        console.error('Some history enabling failed:', failed);
        toast.error(`Failed to enable ${failed.length} features`);
      } else {
        toast.success('All AI history saving enabled');
      }

      // Clear cache and refresh data
      HistoryPreferenceService.clearUserCache(user.id);
      queryClient.invalidateQueries({ queryKey: ['ai-history-preferences', user.id] });
    } catch (error) {
      console.error('Error enabling all history:', error);
      toast.error('Failed to enable all history features');
    }
  };

  // Get preference for specific feature type
  const getPreference = (featureType: string) => {
    return preferences.find(p => p.feature_type === featureType) || {
      feature_type: featureType,
      is_enabled: true,
      retention_days: 90,
      storage_budget_mb: 50,
      auto_cleanup: false
    };
  };

  return {
    preferences,
    isLoading,
    toggleFeature,
    updateRetention,
    toggleAutoCleanup,
    disableAllHistory,
    enableAllHistory,
    getPreference,
    isUpdating: updatePreferenceMutation.isPending
  };
}
