
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { OCRJob } from '../types';
import { OCRJobCard } from './OCRJobCard';

interface OCRJobListProps {
  jobs: OCRJob[];
  onViewResults?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
  isCancelling?: boolean;
  emptyMessage: string;
}

export function OCRJobList({ 
  jobs, 
  onViewResults, 
  onCancel, 
  isCancelling, 
  emptyMessage 
}: OCRJobListProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <OCRJobCard
          key={job.id}
          job={job}
          onViewResults={onViewResults}
          onCancel={onCancel}
          isCancelling={isCancelling}
        />
      ))}
    </div>
  );
}
