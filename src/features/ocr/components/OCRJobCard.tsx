
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye, Square } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { OCRJob } from '../types';

interface OCRJobCardProps {
  job: OCRJob;
  onViewResults?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  isCancelling?: boolean;
  showActions?: boolean;
}

export function OCRJobCard({ 
  job, 
  onViewResults, 
  onCancel, 
  isCancelling = false,
  showActions = true 
}: OCRJobCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const isActive = ['pending', 'processing'].includes(job.status);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(job.status)}>
                {job.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Language: {job.language?.toUpperCase() || 'ENG'}
              </span>
            </div>
            
            {isActive && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Progress</span>
                  <span className="text-sm">{job.progress || 0}%</span>
                </div>
                <Progress value={job.progress || 0} className="w-full" />
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {job.completed_at 
                ? `Completed ${formatDistanceToNow(new Date(job.completed_at))} ago`
                : `Started ${formatDistanceToNow(new Date(job.created_at || ''))} ago`
              }
            </p>
            
            {job.error_message && (
              <p className="text-sm text-red-600">{job.error_message}</p>
            )}
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              {job.status === 'completed' && onViewResults && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewResults(job.id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              )}
              
              {isActive && onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(job.id)}
                  disabled={isCancelling}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
