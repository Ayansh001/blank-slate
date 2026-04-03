
import { Button } from '@/components/ui/button';
import { FileText, Settings } from 'lucide-react';
import { pdfService } from '@/features/pdf/services/PDFService';

interface IdleStateProps {
  file: {
    file_type: string;
    url?: string;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  onQuickProcess: () => void;
  onShowEditor: () => void;
}

export function IdleState({ 
  file, 
  variant = 'outline', 
  size = 'sm', 
  onQuickProcess, 
  onShowEditor 
}: IdleStateProps) {
  const isImage = pdfService.isImageFile(file.file_type);
  const isPDF = pdfService.isPDFFile(file.file_type);

  return (
    <div className="flex space-x-1">
      <Button
        variant={variant}
        size={size}
        onClick={onQuickProcess}
        disabled={!file.url}
      >
        <FileText className="h-4 w-4 mr-2" />
        {isPDF ? 'Extract from PDF' : 'Extract Text'}
      </Button>
      {isImage && (
        <Button
          variant="ghost"
          size={size}
          onClick={onShowEditor}
          disabled={!file.url}
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
