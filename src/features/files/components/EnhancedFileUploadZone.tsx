
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileUploadProgressIndicator } from './FileUploadProgressIndicator';
import { useFileUploadProgress } from '../hooks/useFileUploadProgress';

interface EnhancedFileUploadZoneProps {
  onFilesSelected: (files: File[]) => Promise<any>;
  isUploading?: boolean;
  className?: string;
  acceptedTypes?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

export function EnhancedFileUploadZone({ 
  onFilesSelected, 
  isUploading: externalIsUploading,
  className,
  acceptedTypes = ".pdf,.png,.jpg,.jpeg,.gif,.txt,.md,.doc,.docx",
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10
}: EnhancedFileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const {
    uploadFiles,
    isUploading: internalIsUploading,
    addFilesToQueue,
    removeFile,
    startUpload,
    clearCompleted,
    clearAll,
    getUploadStats
  } = useFileUploadProgress({
    onUploadComplete: (fileId, result) => {
      console.log(`Upload completed for file ${fileId}:`, result);
    },
    onUploadError: (fileId, error) => {
      console.error(`Upload failed for file ${fileId}:`, error);
    },
    onAllUploadsComplete: (results) => {
      console.log('All uploads completed:', results);
      setTimeout(() => {
        setShowProgress(false);
        clearCompleted();
      }, 2000);
    },
    maxConcurrentUploads: 3
  });

  const isUploading = externalIsUploading || internalIsUploading;
  const stats = getUploadStats();

  const validateFile = useCallback((file: File) => {
    if (file.size > maxFileSize) {
      return `File ${file.name} is too large. Maximum size is ${Math.round(maxFileSize / (1024 * 1024))}MB`;
    }
    
    const allowedTypes = acceptedTypes.split(',').map(t => t.trim());
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeTypeAllowed = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return type === fileExt;
      }
      return file.type.startsWith(type.replace('*', ''));
    });
    
    if (!mimeTypeAllowed) {
      return `File type not supported for ${file.name}`;
    }
    
    return null;
  }, [maxFileSize, acceptedTypes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelection(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFilesSelection(files);
    e.target.value = '';
  }, []);

  const handleFilesSelection = useCallback((files: File[]) => {
    if (files.length + uploadFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validationErrors = [];
    const validFiles = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
    }

    if (validFiles.length > 0) {
      addFilesToQueue(validFiles);
      setShowProgress(true);
    }
  }, [uploadFiles.length, maxFiles, validateFile, addFilesToQueue]);

  const handleStartUpload = useCallback(async () => {
    await startUpload(async (file, onProgress) => {
      // Simulate XMLHttpRequest with progress for demo
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = e.loaded / e.total;
            onProgress?.(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve({ success: true, fileName: file.name });
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        // Use the provided onFilesSelected function
        onFilesSelected([file])
          .then(resolve)
          .catch(reject);
      });
    });
  }, [startUpload, onFilesSelected]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Upload Zone */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer min-h-32 sm:min-h-40",
          isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "pointer-events-none opacity-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6 sm:p-8 text-center">
          <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Drop files here to upload</h3>
          <p className="text-muted-foreground text-sm sm:text-base mb-4">
            Support for PDF, images, and documents (max {formatFileSize(maxFileSize)})
          </p>
          <input
            type="file"
            multiple
            accept={acceptedTypes}
            onChange={handleFileSelect}
            className="hidden"
            id="enhanced-file-upload"
            disabled={isUploading}
          />
          <label htmlFor="enhanced-file-upload">
            <Button 
              variant="outline" 
              className="cursor-pointer h-12 px-6 text-base sm:h-10 sm:text-sm" 
              disabled={isUploading}
            >
              Choose Files
            </Button>
          </label>
        </CardContent>
      </Card>

      {/* Upload Queue Management */}
      {showProgress && uploadFiles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h4 className="font-semibold">Upload Progress</h4>
                <Badge variant="outline">
                  {stats.completed + stats.failed}/{stats.total}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                {stats.completed > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {stats.completed}
                  </Badge>
                )}
                {stats.failed > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {stats.failed}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8 px-3"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
            {stats.total > 0 && (
              <div className="text-sm text-muted-foreground">
                Overall Progress: {stats.overallProgress}%
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <FileUploadProgressIndicator
              files={uploadFiles}
              onCancel={removeFile}
            />
            {stats.queued > 0 && !isUploading && (
              <div className="mt-4 flex justify-center">
                <Button onClick={handleStartUpload}>
                  Start Upload ({stats.queued} files)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
