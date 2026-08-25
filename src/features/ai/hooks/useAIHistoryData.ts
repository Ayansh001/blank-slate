
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIHistorySync } from './useAIHistorySync';
import { useAIHistoryPreferences } from '@/hooks/useAIHistoryPreferences';
import { useDatabaseStorage } from '@/hooks/useDatabaseStorage';
import { logger } from '../utils/DebugLogger';
import { DatabaseValidationService } from '../services/DatabaseValidationService';

export interface AIHistoryOverview {
  totalQuizzes: number;
  totalEnhancements: number;
  totalChatSessions: number;
  averageQuizScore: number;
  appliedEnhancements: number;
  totalMessages: number;
  storageUsageBytes: number;
  storageUsageFormatted: string;
  enabledFeatures: number;
  disabledFeatures: number;
  recentActivity: Array<{
    id: string;
    type: 'quiz' | 'enhancement' | 'chat' | 'file_enhancement';
    title: string;
    subtitle: string;
    timestamp: string;
    status: string;
  }>;
}

export interface UseAIHistoryDataReturn {
  overview: AIHistoryOverview | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  canSaveHistory: (featureType: string) => boolean;
}

// Define valid table names as const
const VALID_TABLE_NAMES = ['quiz_sessions', 'note_enhancements', 'ai_chat_sessions'] as const;
type ValidTableName = typeof VALID_TABLE_NAMES[number];

// Type guard to check if string is a valid table name
function isValidTableName(tableName: string): tableName is ValidTableName {
  return VALID_TABLE_NAMES.includes(tableName as ValidTableName);
}

export function useAIHistoryData(): UseAIHistoryDataReturn {
  const { user } = useAuth();
  const [overview, setOverview] = useState<AIHistoryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getPreference } = useAIHistoryPreferences();
  const { storageData } = useDatabaseStorage();

  console.log('useAIHistoryData: Component initialized', { userId: user?.id, loading });

  // Calculate enabled features count once to prevent recalculation loops
  const calculateEnabledFeatures = useCallback(() => {
    const featureTypes = ['quiz_sessions', 'chat_sessions', 'note_enhancements', 'concept_learning', 'document_analyses', 'usage_tracking'];
    let enabledCount = 0;
    let disabledCount = 0;
    
    featureTypes.forEach(featureType => {
      const pref = getPreference(featureType);
      if (pref.is_enabled) {
        enabledCount++;
      } else {
        disabledCount++;
      }
    });
    
    return { enabledCount, disabledCount };
  }, [getPreference]);

  // Fetch data from a specific table with validation
  const fetchTableData = useCallback(async (tableName: string, selectQuery: string, orderBy: string) => {
    try {
      console.log(`useAIHistoryData: Fetching ${tableName}...`);
      
      // Type-safe table name validation
      if (!isValidTableName(tableName)) {
        console.warn(`useAIHistoryData: Invalid table name: ${tableName}`);
        return [];
      }

      const { data, error } = await supabase
        .from(tableName)
        .select(selectQuery)
        .eq('user_id', user!.id)
        .order(orderBy, { ascending: false });

      if (error) {
        console.warn(`useAIHistoryData: ${tableName} query failed:`, error.message);
        if (error.message.includes('does not exist')) {
          return [];
        }
        throw error;
      }

      console.log(`useAIHistoryData: ${tableName} fetched:`, data?.length || 0);
      return data || [];
    } catch (err) {
      console.error(`useAIHistoryData: ${tableName} fetch error:`, err);
      return [];
    }
  }, [user]);

  // Fetch overview data with comprehensive error handling and validation
  const fetchOverviewData = useCallback(async () => {
    if (!user) {
      console.log('useAIHistoryData: No user, skipping fetch');
      setLoading(false);
      setOverview(null);
      setError(null);
      return;
    }

    try {
      console.log('useAIHistoryData: Starting data fetch for user:', user.id);
      setLoading(true);
      setError(null);

      // Validate database tables first
      const tableValidations = await DatabaseValidationService.validateAIHistoryTables(user.id);
      const summary = DatabaseValidationService.getTableSummary();
      
      console.log('useAIHistoryData: Table validation summary:', summary);

      // Fetch data from accessible tables with proper error handling
      const fetchPromises = [];
      
      if (summary.accessible.includes('quiz_sessions')) {
        fetchPromises.push(
          fetchTableData('quiz_sessions', 'id, score, quiz_type, completed_at, time_spent_minutes', 'completed_at')
            .then(data => Array.isArray(data) ? data.filter((quiz: any) => quiz && (quiz.completed === undefined || quiz.completed === true)) : [])
        );
      } else {
        fetchPromises.push(Promise.resolve([]));
      }

      if (summary.accessible.includes('note_enhancements')) {
        fetchPromises.push(
          fetchTableData('note_enhancements', `
            id, enhancement_type, created_at, is_applied, note_id, file_id,
            notes!note_enhancements_note_id_fkey(title),
            files!note_enhancements_file_id_fkey(name, file_type)
          `, 'created_at')
        );
      } else {
        fetchPromises.push(Promise.resolve([]));
      }

      if (summary.accessible.includes('ai_chat_sessions')) {
        fetchPromises.push(
          fetchTableData('ai_chat_sessions', 'id, session_name, total_messages, updated_at', 'updated_at')
        );
      } else {
        fetchPromises.push(Promise.resolve([]));
      }

      const [quizzes, rawEnhancements, rawChats] = await Promise.all(fetchPromises);

      // Apply dashboard-only filtering based on preferences and actual message counts
      // 1) Enhancements: if disabled, only include records created on or before the time it was disabled
      const enhPref = getPreference('note_enhancements');
      let enhancements = rawEnhancements as any[];
      if (!enhPref.is_enabled && 'updated_at' in enhPref && enhPref.updated_at) {
        const disabledAt = new Date(enhPref.updated_at);
        enhancements = Array.isArray(rawEnhancements)
          ? rawEnhancements.filter((enh: any) => !enh?.created_at || new Date(enh.created_at) <= disabledAt)
          : [];
      }

      // 2) Chats: only include sessions with at least one actual message
      let chats: any[] = [];
      let totalMessages = 0;
      if (Array.isArray(rawChats) && rawChats.length > 0) {
        try {
          const sessionIds = rawChats.map((c: any) => c.id);
          const { data: messageRows, error: msgErr } = await supabase
            .from('ai_chat_messages')
            .select('session_id')
            .eq('user_id', user.id)
            .in('session_id', sessionIds);
          if (!msgErr && Array.isArray(messageRows)) {
            const messageCountMap = new Map<string, number>();
            messageRows.forEach((row: any) => {
              const prev = messageCountMap.get(row.session_id) || 0;
              messageCountMap.set(row.session_id, prev + 1);
            });
            chats = rawChats
              .map((c: any) => ({ ...c, actual_message_count: messageCountMap.get(c.id) || 0 }))
              .filter((c: any) => c.actual_message_count > 0);
            totalMessages = Array.from(messageCountMap.values()).reduce((s, n) => s + n, 0);
          } else {
            chats = [];
            totalMessages = 0;
          }
        } catch (e) {
          console.warn('useAIHistoryData: message count fetch failed', e);
          chats = [];
          totalMessages = 0;
        }
      }

      // Calculate overview statistics with proper type checking
      const { enabledCount, disabledCount } = calculateEnabledFeatures();
      const totalQuizzes = Array.isArray(quizzes) ? quizzes.length : 0;
      const totalEnhancements = Array.isArray(enhancements) ? enhancements.length : 0;
      const totalChatSessions = Array.isArray(chats) ? chats.length : 0;

      const averageQuizScore = totalQuizzes > 0 && Array.isArray(quizzes)
        ? quizzes.reduce((sum: number, quiz: any) => (quiz && typeof quiz.score === 'number' ? sum + quiz.score : sum), 0) / totalQuizzes
        : 0;

      const appliedEnhancements = Array.isArray(enhancements)
        ? enhancements.filter((e: any) => e && e.is_applied).length
        : 0;

      // Get storage information with fallback
      const storageUsageBytes = storageData?.total_bytes || 0;
      const storageUsageFormatted = storageData?.total_formatted || '0 B';

      // Create recent activity with robust error handling
      const recentActivity = [
        ...(Array.isArray(quizzes) ? quizzes.slice(0, 3).map((quiz: any) => ({
          id: quiz?.id || 'unknown',
          type: 'quiz' as const,
          title: `Quiz completed: ${(quiz?.quiz_type || 'Unknown').replace('_', ' ')}`,
          subtitle: `Score: ${(quiz?.score || 0).toFixed(0)}% • ${quiz?.time_spent_minutes || 0} minutes`,
          timestamp: quiz?.completed_at || new Date().toISOString(),
          status: 'Completed'
        })) : []),
        ...(Array.isArray(enhancements) ? enhancements.slice(0, 5).map((enhancement: any) => {
          const isFileEnhancement = enhancement?.file_id && !enhancement?.note_id;
          const fileName = enhancement?.files?.[0]?.name || 'Unknown file';
          const noteTitle = enhancement?.notes?.[0]?.title || 'Untitled note';
          
          return {
            id: enhancement?.id || 'unknown',
            type: isFileEnhancement ? 'file_enhancement' as const : 'enhancement' as const,
            title: isFileEnhancement 
              ? `File enhanced: ${(enhancement?.enhancement_type || 'general').replace('_', ' ')}`
              : `Note enhanced: ${(enhancement?.enhancement_type || 'general').replace('_', ' ')}`,
            subtitle: isFileEnhancement ? `File: ${fileName}` : `Note: ${noteTitle}`,
            timestamp: enhancement?.created_at || new Date().toISOString(),
            status: enhancement?.is_applied ? 'Applied' : 'Enhanced'
          };
        }) : []),
        ...(Array.isArray(chats) ? chats.slice(0, 3).map((chat: any) => ({
          id: chat?.id || 'unknown',
          type: 'chat' as const,
          title: `Chat: ${chat?.session_name || 'Untitled Session'}`,
          subtitle: `${chat?.actual_message_count || 0} messages`,
          timestamp: chat?.updated_at || new Date().toISOString(),
          status: 'Active'
        })) : [])
      ]
      .filter(activity => activity && activity.timestamp) // Filter out invalid timestamps
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

      const newOverview = {
        totalQuizzes,
        totalEnhancements,
        totalChatSessions,
        averageQuizScore,
        appliedEnhancements,
        totalMessages,
        storageUsageBytes,
        storageUsageFormatted,
        enabledFeatures: enabledCount,
        disabledFeatures: disabledCount,
        recentActivity
      };

      console.log('useAIHistoryData: Overview calculated successfully:', {
        totalQuizzes,
        totalEnhancements,
        totalChatSessions,
        recentActivityCount: recentActivity.length,
        accessibleTables: summary.accessible.length,
        inaccessibleTables: summary.inaccessible.length
      });

      setOverview(newOverview);
      logger.info('useAIHistoryData', 'Overview data loaded successfully', newOverview);

      // Show warning if some tables are inaccessible
      if (summary.inaccessible.length > 0) {
        console.warn('useAIHistoryData: Some tables are inaccessible:', summary.inaccessible);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('useAIHistoryData: Failed to fetch overview data:', errorMessage, err);
      logger.error('useAIHistoryData', 'Failed to fetch overview data', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, calculateEnabledFeatures, storageData?.total_bytes, storageData?.total_formatted, fetchTableData]);

  // Simplified effect that only triggers on user change
  useEffect(() => {
    console.log('useAIHistoryData: Effect triggered, user ID:', user?.id);
    if (user) {
      fetchOverviewData();
    } else {
      setLoading(false);
      setOverview(null);
      setError(null);
    }
  }, [user?.id]);

  const refreshData = useCallback(async () => {
    console.log('useAIHistoryData: Manual refresh triggered');
    // Clear database validation cache on manual refresh
    DatabaseValidationService.clearCache();
    await fetchOverviewData();
  }, [fetchOverviewData]);

  const canSaveHistory = useCallback((featureType: string): boolean => {
    return getPreference(featureType).is_enabled;
  }, [getPreference]);

  // Enable real-time synchronization with debouncing
  useAIHistorySync(useCallback(() => {
    console.log('useAIHistoryData: Real-time sync triggered');
    const timeoutId = setTimeout(() => {
      refreshData();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [refreshData]));

  return {
    overview,
    loading,
    error,
    refreshData,
    canSaveHistory
  };
}
