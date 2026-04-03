
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { NotificationService } from '@/services/NotificationService';
import { 
  generateThumbnail, 
  compressImage, 
  calculateChecksum, 
  extractMetadata, 
  getCategoryFromType 
} from '@/features/files/utils/fileUtils';
import { useOptimisticTagRemoval } from '@/features/files/hooks/useOptimisticTagRemoval';

export interface FileData {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  uploaded_at: string;
  user_id: string;
  folder_id?: string;
  tags?: string[];
  thumbnail_path?: string;
  metadata?: any;
  version?: number;
  checksum?: string;
  url?: string;
  thumbnail_url?: string;
  // OCR fields
  ocr_text?: string;
  ocr_confidence?: number;
  ocr_language?: string;
  ocr_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
}

export function useFiles(folderId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use optimistic tag removal for better performance - pass folderId
  const { removeTagOptimistically } = useOptimisticTagRemoval(user?.id, folderId);

  // Initialize storage bucket
  useEffect(() => {
    const initializeStorage = async () => {
      if (!user) return;
      
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === 'user-files');
        
        if (!bucketExists) {
          await supabase.storage.createBucket('user-files', {
            public: false,
            allowedMimeTypes: ['image/*', 'application/pdf', 'text/*', 'application/*'],
            fileSizeLimit: 50 * 1024 * 1024 // 50MB
          });
        }
      } catch (error) {
        console.log('Storage initialization:', error);
      }
    };

    initializeStorage();
  }, [user]);

  // Fetch files query
  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ['files', user?.id, folderId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id);

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }

      const { data, error } = await query.order('uploaded_at', { ascending: false });

      if (error) throw error;
      
      // Get signed URLs for files
      const filesWithUrls = await Promise.all(
        data.map(async (file) => {
          try {
            const { data: urlData } = await supabase.storage
              .from('user-files')
              .createSignedUrl(file.file_path, 3600);
            
            let thumbnailUrl;
            if (file.thumbnail_path) {
              const { data: thumbData } = await supabase.storage
                .from('user-files')
                .createSignedUrl(file.thumbnail_path, 3600);
              thumbnailUrl = thumbData?.signedUrl;
            }
            
            return {
              ...file,
              url: urlData?.signedUrl,
              thumbnail_url: thumbnailUrl
            };
          } catch (err) {
            console.error('Error creating signed URL for file:', file.name, err);
            return {
              ...file,
              url: undefined
            };
          }
        })
      );
      
      return filesWithUrls as FileData[];
    },
    enabled: !!user
  });

  // Fixed upload files mutation to avoid duplicate notifications
  const uploadFilesMutation = useMutation({
    mutationFn: async (uploadData: { files: File[], folderId?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { files, folderId } = uploadData;
      const uploadPromises = files.map(async (file) => {
        // Process file
        const processedFile = await compressImage(file);
        const thumbnail = await generateThumbnail(processedFile);
        const checksum = await calculateChecksum(processedFile);
        const metadata = extractMetadata(processedFile);

        // Create file path
        const fileExt = processedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-files')
          .upload(filePath, processedFile);

        if (uploadError) throw uploadError;

        // Upload thumbnail if available
        let thumbnailPath;
        if (thumbnail) {
          const thumbnailBlob = await fetch(thumbnail).then(r => r.blob());
          const thumbPath = `${user.id}/thumbnails/${fileName}`;
          const { error: thumbError } = await supabase.storage
            .from('user-files')
            .upload(thumbPath, thumbnailBlob);
          
          if (!thumbError) {
            thumbnailPath = thumbPath;
          }
        }

        // Save to database
        const { data: dbData, error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            name: processedFile.name,
            file_path: filePath,
            file_type: processedFile.type,
            file_size: processedFile.size,
            category: getCategoryFromType(processedFile.type),
            folder_id: folderId || null,
            thumbnail_path: thumbnailPath,
            metadata,
            checksum,
            tags: []
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Only trigger individual notification for single file uploads
        // For bulk uploads, let the onSuccess handler show the summary
        if (files.length === 1) {
          NotificationService.fileUploaded(processedFile.name, processedFile.size);
        }

        // Trigger auto-analysis for supported file types
        if (processedFile.type === 'application/pdf' || processedFile.type.startsWith('text/') || processedFile.type.startsWith('image/')) {
          try {
            const { data: urlData } = await supabase.storage
              .from('user-files')
              .createSignedUrl(filePath, 3600);
            
            if (urlData?.signedUrl) {
              // Trigger content analysis
              supabase.functions.invoke('ai-content-analyzer', {
                body: {
                  files: [{
                    id: dbData.id,
                    name: processedFile.name,
                    content: '', // Will be extracted by the function
                    url: urlData.signedUrl,
                    uploadedAt: new Date().toISOString()
                  }],
                  analysisType: 'comprehensive'
                }
              }).catch(err => {
                console.error('Auto-analysis failed:', err);
              });
            }
          } catch (err) {
            console.error('Auto-analysis setup failed:', err);
          }
        }

        return dbData;
      });

      return Promise.all(uploadPromises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      
      // Show appropriate notification based on number of files
      if (results.length === 1) {
        // Single file - detailed notification already shown by NotificationService above
        // No additional toast needed
      } else {
        // Multiple files - show bulk notification
        toast.success(`${results.length} files uploaded successfully`);
      }
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload files: ' + error.message);
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data: file, error: fetchError } = await supabase
        .from('files')
        .select('file_path, thumbnail_path')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const filesToDelete = [file.file_path];
      if (file.thumbnail_path) {
        filesToDelete.push(file.thumbnail_path);
      }

      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove(filesToDelete);

      if (storageError) {
        console.warn('Storage deletion error (continuing):', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File deleted successfully');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete file: ' + error.message);
    }
  });

  // Add tags mutation
  const addTagsMutation = useMutation({
    mutationFn: async ({ fileId, tags }: { fileId: string; tags: string[] }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('files')
        .update({ tags })
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Tags added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add tags: ' + error.message);
    }
  });

  // Optimized remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async ({ fileId, tagToRemove }: { fileId: string; tagToRemove: string }) => {
      // Use optimistic removal - this handles the UI update and server call
      await removeTagOptimistically(fileId, tagToRemove);
    },
    // No onSuccess/onError needed - handled by optimistic hook
  });

  // Move files mutation
  const moveFilesMutation = useMutation({
    mutationFn: async ({ fileIds, folderId }: { fileIds: string[]; folderId: string | null }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .in('id', fileIds)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('Files moved successfully');
    },
    onError: (error) => {
      toast.error('Failed to move files: ' + error.message);
    }
  });

  // Update file mutation
  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, updates }: { fileId: string; updates: Partial<FileData> }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('files')
        .update(updates)
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update file: ' + error.message);
    }
  });

  return {
    files,
    isLoading,
    error,
    uploadFiles: (files: File[], folderId?: string) => uploadFilesMutation.mutate({ files, folderId }),
    deleteFile: deleteFileMutation.mutate,
    addTags: addTagsMutation.mutate,
    removeTag: async ({ fileId, tagToRemove }: { fileId: string; tagToRemove: string }) => {
      await removeTagOptimistically(fileId, tagToRemove);
    },
    moveFiles: moveFilesMutation.mutate,
    updateFile: updateFileMutation.mutate,
    isUploading: uploadFilesMutation.isPending,
    isDeleting: deleteFileMutation.isPending
  };
}
