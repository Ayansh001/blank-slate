
import { Button } from '@/components/ui/button';
import { Eye, Save, RefreshCw } from 'lucide-react';
import { pdfService } from '@/features/pdf/services/PDFService';

interface CompletedStateProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  onViewResults: () => void;
  onQuickSave: () => void;
  onReProcess?: () => void;
  fileType?: string;
}

export function CompletedState({ 
  variant = 'outline', 
  size = 'sm', 
  onViewResults, 
  onQuickSave,
  onReProcess,
  fileType
}: CompletedStateProps) {
  const isPDF = pdfService.isPDFFile(fileType || '');
  
  return (
    <div className="flex space-x-1">
      <Button
        variant={variant}
        size={size}
        onClick={onViewResults}
      >
        <Eye className="h-4 w-4 mr-2" />
        View OCR
      </Button>
      <Button
        variant="ghost"
        size={size}
        onClick={onQuickSave}
        title="Quick save to notes"
      >
        <Save className="h-4 w-4" />
      </Button>
      {isPDF && onReProcess && (
        <Button
          variant="ghost"
          size={size}
          onClick={onReProcess}
          title="Process more pages or re-process"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
