
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadProgressFile {
  id: string;
  file: File;
  status: 'queued' | 'compressing' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  uploadSpeed?: number;
  error?: string;
  estimatedTimeRemaining?: number;
}

interface FileUploadProgressIndicatorProps {
  files: UploadProgressFile[];
  onCancel?: (fileId: string) => void;
  className?: string;
}

export function FileUploadProgressIndicator({ 
  files, 
  onCancel, 
  className 
}: FileUploadProgressIndicatorProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'compressing':
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'secondary';
      case 'compressing':
        return 'outline';
      case 'uploading':
        return 'default';
      case 'processing':
        return 'outline';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'compressing':
        return 'bg-yellow-500';
      case 'uploading':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-muted-foreground';
    }
  };

  if (files.length === 0) return null;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getStatusIcon(file.status)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{file.file.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file.size)}</span>
                      {file.uploadSpeed && file.status === 'uploading' && (
                        <>
                          <span>•</span>
                          <span>{formatSpeed(file.uploadSpeed)}</span>
                        </>
                      )}
                      {file.estimatedTimeRemaining && file.status === 'uploading' && (
                        <>
                          <span>•</span>
                          <span>{formatTime(file.estimatedTimeRemaining)} left</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getStatusColor(file.status)} className="text-xs">
                    {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                  </Badge>
                  {file.status !== 'completed' && onCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancel(file.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {file.status === 'completed' ? 'Complete' : `${Math.round(file.progress)}%`}
                  </span>
                  {file.error && (
                    <span className="text-red-500 text-xs">{file.error}</span>
                  )}
                </div>
                <Progress 
                  value={file.progress} 
                  className="h-1.5"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
