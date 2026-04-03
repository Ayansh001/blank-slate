
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatFileSize } from '@/features/files/utils/fileUtils';
import { toast } from 'sonner';

export interface StorageUsage {
  totalUsed: number;
  totalUsedFormatted: string;
  totalLimit: number;
  totalLimitFormatted: string;
  usagePercentage: number;
  categoryBreakdown: {
    [key: string]: {
      size: number;
      sizeFormatted: string;
      count: number;
      percentage: number;
    };
  };
  isNearLimit: boolean;
  isOverLimit: boolean;
}

export function useStorageUsage() {
  const { user } = useAuth();
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase free tier limit is 1GB (fixed from placeholder data)
  const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1GB in bytes

  const calculateStorageUsage = async (): Promise<StorageUsage | null> => {
    if (!user) {
      console.log('[StorageUsage] No user authenticated');
      return null;
    }

    console.log('[StorageUsage] Calculating storage for user:', user.id);

    try {
      // Get all files for the user with explicit user_id filtering
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('file_size, file_type, category, name')
        .eq('user_id', user.id);

      if (filesError) {
        console.error('[StorageUsage] Database error:', filesError);
        throw new Error(`Failed to fetch files: ${filesError.message}`);
      }

      console.log('[StorageUsage] Retrieved files:', files?.length || 0, 'files');
      console.log('[StorageUsage] Files data:', files);

      if (!files || files.length === 0) {
        console.log('[StorageUsage] No files found, returning zero usage');
        return {
          totalUsed: 0,
          totalUsedFormatted: formatFileSize(0),
          totalLimit: STORAGE_LIMIT,
          totalLimitFormatted: formatFileSize(STORAGE_LIMIT),
          usagePercentage: 0,
          categoryBreakdown: {},
          isNearLimit: false,
          isOverLimit: false,
        };
      }

      // Calculate total storage used with validation
      const totalUsed = files.reduce((sum, file) => {
        const fileSize = file.file_size || 0;
        console.log('[StorageUsage] File:', file.name, 'Size:', fileSize, 'bytes');
        return sum + fileSize;
      }, 0);

      console.log('[StorageUsage] Total calculated size:', totalUsed, 'bytes');
      console.log('[StorageUsage] Total formatted size:', formatFileSize(totalUsed));

      const usagePercentage = (totalUsed / STORAGE_LIMIT) * 100;

      // Calculate category breakdown with detailed logging
      const categoryBreakdown: StorageUsage['categoryBreakdown'] = {};
      
      files.forEach(file => {
        const category = file.category || file.file_type || 'Other';
        const size = file.file_size || 0;
        
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = {
            size: 0,
            sizeFormatted: '',
            count: 0,
            percentage: 0,
          };
        }
        
        categoryBreakdown[category].size += size;
        categoryBreakdown[category].count += 1;
      });

      // Format category data and calculate percentages
      Object.keys(categoryBreakdown).forEach(category => {
        const data = categoryBreakdown[category];
        data.sizeFormatted = formatFileSize(data.size);
        data.percentage = totalUsed > 0 ? (data.size / totalUsed) * 100 : 0;
      });

      console.log('[StorageUsage] Category breakdown:', categoryBreakdown);

      const result = {
        totalUsed,
        totalUsedFormatted: formatFileSize(totalUsed),
        totalLimit: STORAGE_LIMIT,
        totalLimitFormatted: formatFileSize(STORAGE_LIMIT),
        usagePercentage,
        categoryBreakdown,
        isNearLimit: usagePercentage >= 80,
        isOverLimit: usagePercentage >= 100,
      };

      console.log('[StorageUsage] Final result:', result);
      return result;

    } catch (error: any) {
      console.error('[StorageUsage] Error calculating storage usage:', error);
      setError(error.message);
      return null;
    }
  };

  const refreshStorageUsage = async () => {
    console.log('[StorageUsage] Manual refresh triggered');
    setIsLoading(true);
    setError(null);
    
    const usage = await calculateStorageUsage();
    setStorageUsage(usage);
    setIsLoading(false);

    // Show warnings for storage usage
    if (usage?.isOverLimit) {
      toast.error('Storage limit exceeded!', {
        description: 'Please delete some files to free up space.'
      });
    } else if (usage?.isNearLimit) {
      toast.warning('Storage almost full', {
        description: `You're using ${usage.usagePercentage.toFixed(1)}% of your storage.`
      });
    }

    console.log('[StorageUsage] Refresh completed, usage:', usage);
  };

  useEffect(() => {
    if (!user) {
      console.log('[StorageUsage] No user, clearing storage data');
      setStorageUsage(null);
      setIsLoading(false);
      return;
    }

    console.log('[StorageUsage] User authenticated, initializing storage calculation');
    refreshStorageUsage();

    // Set up real-time subscription for file changes
    const channel = supabase
      .channel('storage_usage_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[StorageUsage] Real-time file change detected:', payload);
          // Refresh storage usage when files change
          refreshStorageUsage();
        }
      )
      .subscribe();

    return () => {
      console.log('[StorageUsage] Cleaning up subscription');
      channel.unsubscribe();
    };
  }, [user?.id]);

  return {
    storageUsage,
    isLoading,
    error,
    refreshStorageUsage,
  };
}
