
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { FolderDeletionService, FolderContents } from '../services/FolderDeletionService';

export interface FolderData {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export function useFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ['folders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as FolderData[];
    },
    enabled: !!user
  });

  const createFolderMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          parent_id: parentId || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Folder created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create folder: ' + error.message);
    }
  });

  // New enhanced deletion mutation
  const deleteFolderWithContentsMutation = useMutation({
    mutationFn: async (folderId: string) => {
      if (!user) throw new Error('User not authenticated');
      await FolderDeletionService.deleteFolderRecursively(folderId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Folder deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete folder: ' + error.message);
    }
  });

  // Function to check folder contents
  const checkFolderContents = async (folderId: string): Promise<FolderContents | null> => {
    if (!user) return null;
    
    try {
      return await FolderDeletionService.getFolderContents(folderId, user.id);
    } catch (error) {
      console.error('Error checking folder contents:', error);
      return null;
    }
  };

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, newName }: { folderId: string; newName: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Folder renamed successfully');
    },
    onError: (error) => {
      toast.error('Failed to rename folder: ' + error.message);
    }
  });

  const buildFolderTree = (folders: FolderData[]): FolderData[] => {
    const folderMap = new Map<string, FolderData & { children: FolderData[] }>();
    
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    const rootFolders: (FolderData & { children: FolderData[] })[] = [];
    
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children.push(folderWithChildren);
        }
      } else {
        rootFolders.push(folderWithChildren);
      }
    });

    return rootFolders;
  };

  return {
    folders,
    folderTree: buildFolderTree(folders),
    isLoading,
    createFolder: createFolderMutation.mutate,
    deleteFolder: deleteFolderWithContentsMutation.mutate,
    checkFolderContents,
    renameFolder: renameFolderMutation.mutate,
    isCreating: createFolderMutation.isPending,
    isDeleting: deleteFolderWithContentsMutation.isPending,
    isRenaming: renameFolderMutation.isPending
  };
}
