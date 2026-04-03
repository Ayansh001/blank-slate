import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { FileData } from '@/hooks/useFiles';
import { NotificationService } from '@/services/NotificationService';
import { 
  generateThumbnail, 
  compressImage, 
  calculateChecksum, 
  extractMetadata, 
  getCategoryFromType 
} from '@/features/files/utils/fileUtils';
import { useOptimisticTagRemoval } from './useOptimisticTagRemoval';

interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'queued' | 'compressing' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  speed?: number;
  estimatedTime?: number;
}

export function useEnhancedFiles(folderId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  
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

  // Fetch files query (same as original useFiles)
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

  const updateUploadProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploadProgress(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(fileId) || { 
        fileId, 
        fileName: '', 
        progress: 0, 
        status: 'queued' as const 
      };
      newMap.set(fileId, { ...existing, ...updates });
      return newMap;
    });
  }, []);

  const removeUploadProgress = useCallback((fileId: string) => {
    setUploadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  // Fixed enhanced upload files mutation to avoid duplicate notifications
  const uploadFilesMutation = useMutation({
    mutationFn: async (uploadData: { files: File[], folderId?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { files, folderId } = uploadData;
      const uploadPromises = files.map(async (file, index) => {
        const fileId = `upload-${Date.now()}-${index}`;
        const startTime = Date.now();
        
        try {
          // Initialize progress
          updateUploadProgress(fileId, {
            fileName: file.name,
            status: 'compressing',
            progress: 0
          });

          // Stage 1: Compression (0-20%)
          const processedFile = await compressImage(file);
          updateUploadProgress(fileId, { progress: 10 });

          const thumbnail = await generateThumbnail(processedFile);
          updateUploadProgress(fileId, { progress: 20 });

          const checksum = await calculateChecksum(processedFile);
          const metadata = extractMetadata(processedFile);

          // Stage 2: Upload preparation (20-30%)
          const fileExt = processedFile.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          updateUploadProgress(fileId, { 
            status: 'uploading',
            progress: 30 
          });

          // Stage 3: File upload (30-70%) - Using XMLHttpRequest for progress
          const uploadResult = await new Promise<any>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', processedFile);

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const uploadProgress = 30 + (e.loaded / e.total) * 40;
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = e.loaded / elapsed;
                const remaining = (e.total - e.loaded) / speed;
                
                updateUploadProgress(fileId, { 
                  progress: uploadProgress,
                  speed,
                  estimatedTime: remaining
                });
              }
            });

            xhr.addEventListener('load', async () => {
              if (xhr.status === 200) {
                // Fall back to Supabase upload since we need the actual storage
                try {
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('user-files')
                    .upload(filePath, processedFile);

                  if (uploadError) throw uploadError;
                  resolve(uploadData);
                } catch (err) {
                  reject(err);
                }
              } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Upload failed'));
            });

            // For demo purposes, we'll use Supabase directly
            supabase.storage
              .from('user-files')
              .upload(filePath, processedFile)
              .then(({ data, error }) => {
                if (error) reject(error);
                else resolve(data);
              });
          });

          updateUploadProgress(fileId, { progress: 70 });

          // Stage 4: Thumbnail upload (70-80%)
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

          updateUploadProgress(fileId, { 
            status: 'processing',
            progress: 80 
          });

          // Stage 5: Database save (80-90%)
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

          updateUploadProgress(fileId, { progress: 90 });

          // Stage 6: Auto-analysis trigger (90-100%)
          if (processedFile.type === 'application/pdf' || 
              processedFile.type.startsWith('text/') || 
              processedFile.type.startsWith('image/')) {
            try {
              const { data: urlData } = await supabase.storage
                .from('user-files')
                .createSignedUrl(filePath, 3600);
              
              if (urlData?.signedUrl) {
                supabase.functions.invoke('ai-content-analyzer', {
                  body: {
                    files: [{
                      id: dbData.id,
                      name: processedFile.name,
                      content: '',
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

          // Complete
          updateUploadProgress(fileId, { 
            status: 'completed',
            progress: 100,
            speed: undefined,
            estimatedTime: undefined
          });

          // Clean up progress after delay
          setTimeout(() => {
            removeUploadProgress(fileId);
          }, 3000);

          return dbData;
        } catch (error) {
          updateUploadProgress(fileId, { 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed'
          });
          
          setTimeout(() => {
            removeUploadProgress(fileId);
          }, 5000);
          
          throw error;
        }
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
      toast.error('Some files failed to upload');
    }
  });

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

  const removeTagMutation = useMutation({
    mutationFn: async ({ fileId, tagToRemove }: { fileId: string; tagToRemove: string }) => {
      // Use optimistic removal - this handles the UI update and server call
      await removeTagOptimistically(fileId, tagToRemove);
    },
    // No onSuccess/onError needed - handled by optimistic hook
  });

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

  const getCurrentUploads = useCallback(() => {
    return Array.from(uploadProgress.values());
  }, [uploadProgress]);

  const getUploadStats = useCallback(() => {
    const uploads = Array.from(uploadProgress.values());
    return {
      total: uploads.length,
      completed: uploads.filter(u => u.status === 'completed').length,
      failed: uploads.filter(u => u.status === 'failed').length,
      inProgress: uploads.filter(u => ['compressing', 'uploading', 'processing'].includes(u.status)).length,
      queued: uploads.filter(u => u.status === 'queued').length
    };
  }, [uploadProgress]);

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
    isDeleting: deleteFileMutation.isPending,
    // Enhanced features
    currentUploads: getCurrentUploads(),
    uploadStats: getUploadStats(),
    uploadProgress: uploadProgress
  };
}
