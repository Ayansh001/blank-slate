
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Play, Eye, Square } from 'lucide-react';
import { OCRJob } from '../types';

interface OCRStatsCardsProps {
  ocrJobs: OCRJob[];
}

export function OCRStatsCards({ ocrJobs }: OCRStatsCardsProps) {
  const activeJobs = ocrJobs.filter(job => ['pending', 'processing'].includes(job.status));
  const completedJobs = ocrJobs.filter(job => job.status === 'completed');
  const failedJobs = ocrJobs.filter(job => job.status === 'failed');

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
              <p className="text-2xl font-bold">{ocrJobs.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Play className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{activeJobs.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completedJobs.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <Square className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold">{failedJobs.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
