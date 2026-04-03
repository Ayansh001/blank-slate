
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface StorageCategory {
  category: string;
  records: number;
  size_bytes: number;
  size_formatted: string;
  bytes: number;
}

interface DatabaseStorageData {
  total_bytes: number;
  total_formatted: string;
  categories: StorageCategory[];
}

// Define all possible categories that should always be shown
const ALL_CATEGORIES = [
  'quiz_sessions',
  'note_enhancements', 
  'chat_sessions'
] as const;

export function useDatabaseStorage() {
  const { user } = useAuth();

  const { data: storageData, isLoading, refetch } = useQuery({
    queryKey: ['database-storage', user?.id],
    queryFn: async () => {
      if (!user) return null;

      let totalBytes = 0;
      const categoryMap = new Map<string, StorageCategory>();

      // Initialize all categories with zero values
      ALL_CATEGORIES.forEach(category => {
        categoryMap.set(category, {
          category,
          records: 0,
          size_bytes: 0,
          size_formatted: formatBytes(0),
          bytes: 0
        });
      });

      // Check quiz_sessions storage
      try {
        const { count, error } = await supabase
          .from('quiz_sessions')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        if (!error && count !== null) {
          const estimatedSize = count * 2048; // Rough estimate per record
          totalBytes += estimatedSize;
          categoryMap.set('quiz_sessions', {
            category: 'quiz_sessions',
            records: count,
            size_bytes: estimatedSize,
            size_formatted: formatBytes(estimatedSize),
            bytes: estimatedSize
          });
        }
      } catch (error) {
        console.warn('Quiz sessions table not available');
      }

      // Check note_enhancements storage
      try {
        const { count, error } = await supabase
          .from('note_enhancements')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        if (!error && count !== null) {
          const estimatedSize = count * 1024; // Rough estimate per record
          totalBytes += estimatedSize;
          categoryMap.set('note_enhancements', {
            category: 'note_enhancements',
            records: count,
            size_bytes: estimatedSize,
            size_formatted: formatBytes(estimatedSize),
            bytes: estimatedSize
          });
        }
      } catch (error) {
        console.warn('Note enhancements table not available');
      }

      // Check chat_sessions storage
      try {
        const { count, error } = await supabase
          .from('ai_chat_sessions')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        if (!error && count !== null) {
          const estimatedSize = count * 512; // Rough estimate per record
          totalBytes += estimatedSize;
          categoryMap.set('chat_sessions', {
            category: 'chat_sessions',
            records: count,
            size_bytes: estimatedSize,
            size_formatted: formatBytes(estimatedSize),
            bytes: estimatedSize
          });
        }
      } catch (error) {
        console.warn('Chat sessions table not available');
      }

      // Convert map to array, ensuring all categories are always present
      const categories = Array.from(categoryMap.values());

      return {
        total_bytes: totalBytes,
        total_formatted: formatBytes(totalBytes),
        categories
      } as DatabaseStorageData;
    },
    enabled: !!user
  });

  const refreshStorage = async () => {
    await refetch();
  };

  return {
    storageData,
    isLoading,
    refreshStorage
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}
