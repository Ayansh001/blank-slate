
import { useState, useCallback, useRef } from 'react';
import { UploadProgressFile } from '@/features/files/components/FileUploadProgressIndicator';

interface UseFileUploadProgressOptions {
  onUploadComplete?: (fileId: string, result: any) => void;
  onUploadError?: (fileId: string, error: Error) => void;
  onAllUploadsComplete?: (results: any[]) => void;
  maxConcurrentUploads?: number;
}

export function useFileUploadProgress(options: UseFileUploadProgressOptions = {}) {
  const [uploadFiles, setUploadFiles] = useState<UploadProgressFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const uploadRefs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const startTimes = useRef<Map<string, number>>(new Map());
  const uploadedBytes = useRef<Map<string, number>>(new Map());

  const addFilesToQueue = useCallback((files: File[]) => {
    const newUploadFiles = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      file,
      status: 'queued' as const,
      progress: 0
    }));

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
    return newUploadFiles;
  }, []);

  const updateFileProgress = useCallback((fileId: string, updates: Partial<UploadProgressFile>) => {
    setUploadFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    // Cancel ongoing upload if exists
    const xhr = uploadRefs.current.get(fileId);
    if (xhr) {
      xhr.abort();
      uploadRefs.current.delete(fileId);
    }
    
    startTimes.current.delete(fileId);
    uploadedBytes.current.delete(fileId);
    
    setUploadFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const calculateUploadSpeed = useCallback((fileId: string, loaded: number) => {
    const startTime = startTimes.current.get(fileId);
    if (!startTime) return 0;
    
    const elapsed = (Date.now() - startTime) / 1000;
    return elapsed > 0 ? loaded / elapsed : 0;
  }, []);

  const calculateEstimatedTime = useCallback((fileId: string, loaded: number, total: number, speed: number) => {
    const remaining = total - loaded;
    return speed > 0 ? remaining / speed : 0;
  }, []);

  const simulateFileProcessing = useCallback(async (
    uploadFile: UploadProgressFile,
    uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<any>
  ) => {
    const { id, file } = uploadFile;
    
    try {
      // Stage 1: Compression
      updateFileProgress(id, { status: 'compressing', progress: 0 });
      
      // Simulate compression progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        updateFileProgress(id, { progress: i * 0.2 }); // 20% for compression
      }

      // Stage 2: Upload
      updateFileProgress(id, { status: 'uploading', progress: 20 });
      startTimes.current.set(id, Date.now());
      
      const result = await uploadFunction(file, (progress) => {
        const uploadProgress = 20 + (progress * 0.6); // 60% for upload
        const speed = calculateUploadSpeed(id, progress * file.size);
        const estimatedTime = calculateEstimatedTime(id, progress * file.size, file.size, speed);
        
        updateFileProgress(id, {
          progress: uploadProgress,
          uploadSpeed: speed,
          estimatedTimeRemaining: estimatedTime
        });
      });

      // Stage 3: Processing
      updateFileProgress(id, { 
        status: 'processing', 
        progress: 80,
        uploadSpeed: undefined,
        estimatedTimeRemaining: undefined
      });
      
      // Simulate processing
      for (let i = 80; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 100));
        updateFileProgress(id, { progress: i });
      }

      // Complete
      updateFileProgress(id, { status: 'completed', progress: 100 });
      options.onUploadComplete?.(id, result);
      
      return result;
    } catch (error) {
      console.error(`Upload failed for ${file.name}:`, error);
      updateFileProgress(id, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      options.onUploadError?.(id, error as Error);
      throw error;
    } finally {
      uploadRefs.current.delete(id);
      startTimes.current.delete(id);
      uploadedBytes.current.delete(id);
    }
  }, [updateFileProgress, calculateUploadSpeed, calculateEstimatedTime, options]);

  const startUpload = useCallback(async (
    uploadFunction: (file: File, onProgress?: (progress: number) => void) => Promise<any>
  ) => {
    const queuedFiles = uploadFiles.filter(f => f.status === 'queued');
    if (queuedFiles.length === 0) return;

    setIsUploading(true);
    const maxConcurrent = options.maxConcurrentUploads || 3;
    const results: any[] = [];

    try {
      // Process files in batches
      for (let i = 0; i < queuedFiles.length; i += maxConcurrent) {
        const batch = queuedFiles.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(uploadFile => 
          simulateFileProcessing(uploadFile, uploadFunction)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : null));
      }

      options.onAllUploadsComplete?.(results.filter(Boolean));
    } finally {
      setIsUploading(false);
    }

    return results;
  }, [uploadFiles, simulateFileProcessing, options]);

  const clearCompleted = useCallback(() => {
    setUploadFiles(prev => prev.filter(file => file.status !== 'completed'));
  }, []);

  const clearAll = useCallback(() => {
    // Cancel all ongoing uploads
    uploadRefs.current.forEach(xhr => xhr.abort());
    uploadRefs.current.clear();
    startTimes.current.clear();
    uploadedBytes.current.clear();
    
    setUploadFiles([]);
    setIsUploading(false);
  }, []);

  const getUploadStats = useCallback(() => {
    const total = uploadFiles.length;
    const completed = uploadFiles.filter(f => f.status === 'completed').length;
    const failed = uploadFiles.filter(f => f.status === 'failed').length;
    const inProgress = uploadFiles.filter(f => 
      ['compressing', 'uploading', 'processing'].includes(f.status)
    ).length;

    const overallProgress = total > 0 
      ? uploadFiles.reduce((sum, file) => sum + file.progress, 0) / total 
      : 0;

    return {
      total,
      completed,
      failed,
      inProgress,
      queued: uploadFiles.filter(f => f.status === 'queued').length,
      overallProgress: Math.round(overallProgress)
    };
  }, [uploadFiles]);

  return {
    uploadFiles,
    isUploading,
    addFilesToQueue,
    removeFile,
    startUpload,
    clearCompleted,
    clearAll,
    getUploadStats
  };
}
