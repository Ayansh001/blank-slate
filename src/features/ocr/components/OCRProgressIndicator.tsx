
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface OCRProgressIndicatorProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileName?: string;
  error?: string;
  queuePosition?: number;
}

export function OCRProgressIndicator({ 
  status, 
  progress, 
  fileName, 
  error,
  queuePosition 
}: OCRProgressIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return queuePosition ? `Queued (position ${queuePosition})` : 'Queued';
      case 'processing':
        return `Processing... ${progress}%`;
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="font-medium text-sm">{fileName || 'Processing file'}</p>
            <p className="text-xs text-muted-foreground">{getStatusText()}</p>
          </div>
        </div>
        
        {status === 'processing' && (
          <Progress value={progress} className="h-2" />
        )}
        
        {status === 'failed' && error && (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
