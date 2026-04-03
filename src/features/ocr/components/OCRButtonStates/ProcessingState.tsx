
import { Badge } from '@/components/ui/badge';
import { QuizGeneratingLoader } from '@/components/ui/QuizGeneratingLoader';
import { OCRJob } from '../../types';

interface ProcessingStateProps {
  ocrJob?: OCRJob;
  isConvertingFile: boolean;
}

export function ProcessingState({ ocrJob, isConvertingFile }: ProcessingStateProps) {
  const progress = ocrJob?.progress || 0;
  
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <QuizGeneratingLoader className="h-3 w-3" />
      {isConvertingFile ? 'Preparing...' : `Processing... ${progress}%`}
    </Badge>
  );
}
