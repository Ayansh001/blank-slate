
import { Badge } from '@/components/ui/badge';
import { HourglassLoader } from '@/components/ui/HourglassLoader';
import { OCRJob } from '../../types';

interface OCRProcessingStateProps {
  ocrJob?: OCRJob;
  isConvertingFile: boolean;
}

export function OCRProcessingState({ ocrJob, isConvertingFile }: OCRProcessingStateProps) {
  const progress = ocrJob?.progress || 0;
  
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <HourglassLoader className="h-3 w-3" />
      {isConvertingFile ? 'Preparing...' : `Processing... ${progress}%`}
    </Badge>
  );
}
