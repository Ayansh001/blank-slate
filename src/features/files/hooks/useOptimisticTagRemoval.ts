
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileData } from '@/hooks/useFiles';
import { TagRemovalService } from '../services/TagRemovalService';
import { toast } from 'sonner';

export function useOptimisticTagRemoval(userId: string | undefined, folderId?: string | null) {
  const queryClient = useQueryClient();

  const removeTagOptimistically = useCallback(async (fileId: string, tagToRemove: string) => {
    if (!userId) return;

    // Use the correct query key that matches the files hook
    const queryKey = ['files', userId, folderId];
    const previousData = queryClient.getQueryData<FileData[]>(queryKey);
    
    if (!previousData) return;

    // Optimistically update the UI immediately
    const optimisticData = previousData.map(file => {
      if (file.id === fileId) {
        return {
          ...file,
          tags: (file.tags || []).filter(tag => tag !== tagToRemove)
        };
      }
      return file;
    });

    // Update the cache immediately for instant UI feedback
    queryClient.setQueryData(queryKey, optimisticData);

    try {
      // Perform the actual server update
      const updatedTags = await TagRemovalService.removeTagOptimized(fileId, tagToRemove, userId);
      
      // Update cache with server response to ensure consistency
      const serverData = previousData.map(file => {
        if (file.id === fileId) {
          return {
            ...file,
            tags: updatedTags
          };
        }
        return file;
      });

      queryClient.setQueryData(queryKey, serverData);
      
      // Invalidate all files queries to ensure consistency across different folder views
      queryClient.invalidateQueries({ queryKey: ['files'] });
      
      toast.success('Tag removed');
      
    } catch (error) {
      // Rollback optimistic update on error
      queryClient.setQueryData(queryKey, previousData);
      console.error('Failed to remove tag:', error);
      toast.error('Failed to remove tag');
    }
  }, [userId, folderId, queryClient]);

  return { removeTagOptimistically };
}
