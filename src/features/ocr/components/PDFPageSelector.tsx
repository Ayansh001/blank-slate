
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { usePDFLoader } from '../hooks/usePDFLoader';
import { usePageSelection } from '../hooks/usePageSelection';
import { SelectionControls } from './PDFPageSelector/SelectionControls';
import { PageGrid } from './PDFPageSelector/PageGrid';
import { LoadingState, ErrorState } from './PDFPageSelector/LoadingStates';
import { FileData } from '@/hooks/useFiles';

interface PDFPageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  pdfFile: File | FileData;
  onPagesSelected: (pages: number[]) => void;
  isProcessing?: boolean;
  isReProcessing?: boolean;
}

export function PDFPageSelector({ 
  isOpen, 
  onClose, 
  pdfFile, 
  onPagesSelected,
  isProcessing = false,
  isReProcessing = false
}: PDFPageSelectorProps) {
  const { pageCount, isLoading, error } = usePDFLoader({ pdfFile, isOpen });
  const { selectedPages, handlePageToggle, handleSelectAll, handleSelectRange } = usePageSelection({ pageCount });

  const handleProcess = () => {
    if (selectedPages.length > 0) {
      onPagesSelected(selectedPages);
    }
  };

  if (isLoading) {
    return <LoadingState isOpen={isOpen} onClose={onClose} />;
  }

  if (error) {
    return <ErrorState isOpen={isOpen} onClose={onClose} error={error} />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isReProcessing ? 'Process More Pages' : 'Select Pages for OCR'}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {isReProcessing 
              ? 'Select additional pages to process or re-process existing ones'
              : 'Choose which pages to extract text from'
            } ({pageCount} pages total)
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <SelectionControls
            selectedCount={selectedPages.length}
            totalCount={pageCount}
            onSelectAll={handleSelectAll}
            onSelectRange={handleSelectRange}
          />

          <PageGrid
            pageCount={pageCount}
            selectedPages={selectedPages}
            onPageToggle={handlePageToggle}
          />

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            
            <Button 
              onClick={handleProcess}
              disabled={selectedPages.length === 0 || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Extract Text from {selectedPages.length} Page{selectedPages.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
