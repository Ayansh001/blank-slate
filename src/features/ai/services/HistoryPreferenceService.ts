
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../utils/DebugLogger';

export interface HistoryPreference {
  feature_type: string;
  is_enabled: boolean;
  retention_days: number;
  storage_budget_mb: number;
  auto_cleanup: boolean;
}

class HistoryPreferenceServiceClass {
  private cache: Map<string, HistoryPreference> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a specific feature type is enabled for history saving
   */
  async isEnabled(userId: string, featureType: string): Promise<boolean> {
    if (!userId || !featureType) {
      logger.warn('HistoryPreferenceService', 'Missing userId or featureType', { userId, featureType });
      return false;
    }

    try {
      const preference = await this.getPreference(userId, featureType);
      return preference?.is_enabled ?? true; // Default to enabled if no preference found
    } catch (error) {
      logger.error('HistoryPreferenceService', 'Error checking if enabled', error);
      // Default to enabled on error to avoid breaking functionality
      return true;
    }
  }

  /**
   * Get preference for a specific feature type
   */
  private async getPreference(userId: string, featureType: string): Promise<HistoryPreference | null> {
    const cacheKey = `${userId}-${featureType}`;
    const now = Date.now();

    // Check cache first
    if (this.cache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const { data, error } = await supabase
        .from('ai_history_preferences')
        .select('feature_type, is_enabled, retention_days, storage_budget_mb, auto_cleanup')
        .eq('user_id', userId)
        .eq('feature_type', featureType)
        .maybeSingle();

      if (error) {
        logger.warn('HistoryPreferenceService', 'Database query failed', error);
        return null;
      }

      const preference = data as HistoryPreference | null;

      // Cache the result
      if (preference) {
        this.cache.set(cacheKey, preference);
        this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
      }

      return preference;
    } catch (error) {
      logger.error('HistoryPreferenceService', 'Failed to get preference', error);
      return null;
    }
  }

  /**
   * Get all preferences for a user
   */
  async getAll(userId: string): Promise<HistoryPreference[]> {
    if (!userId) {
      logger.warn('HistoryPreferenceService', 'Missing userId for getAll');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('ai_history_preferences')
        .select('feature_type, is_enabled, retention_days, storage_budget_mb, auto_cleanup')
        .eq('user_id', userId);

      if (error) {
        logger.error('HistoryPreferenceService', 'Failed to get all preferences', error);
        return [];
      }

      return data as HistoryPreference[];
    } catch (error) {
      logger.error('HistoryPreferenceService', 'Error getting all preferences', error);
      return [];
    }
  }

  /**
   * Clear cache for a user (useful after preference updates)
   */
  clearUserCache(userId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(`${userId}-`));
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

export const HistoryPreferenceService = new HistoryPreferenceServiceClass();
