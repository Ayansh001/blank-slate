import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOCRButtonState } from '../hooks/useOCRButtonState';
import { useFileConverter } from '../hooks/useFileConverter';
import { useOCRProcessor } from '../hooks/useOCRProcessor';
import { OCRProcessingState, CompletedState, IdleState } from './OCRButtonStates';
import { ImageEditor } from './ImageEditor';
import { OCRTextEditor } from './OCRTextEditor';
import { QuickSaveToNotes } from './QuickSaveToNotes';
import { PDFPageSelector } from './PDFPageSelector';
import { OCRErrorBoundary } from './OCRErrorBoundary';
import { normalizeConfidence } from '../utils/confidenceUtils';
import { FileData } from '@/hooks/useFiles';
import { pdfService } from '@/features/pdf/services/PDFService';
import { toast } from 'sonner';

interface OCRButtonProps {
  file: FileData;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function OCRButton({ file, variant = 'outline', size = 'sm' }: OCRButtonProps) {
  const { convertUrlToFile } = useFileConverter();
  const {
    showEditor,
    showResults,
    showQuickSave,
    showPDFSelector,
    isConvertingFile,
    isProcessing,
    hasOCRText,
    ocrJob,
    lastOCRResult,
    setShowEditor,
    setShowResults,
    setShowQuickSave,
    setShowPDFSelector,
    setIsConvertingFile,
    handleQuickSaveClose,
    clearLastResult
  } = useOCRButtonState({ file });

  const { processOCR } = useOCRProcessor({
    // Let users control when to view results via toast notification
  });

  // Add event listener for notification actions
  useEffect(() => {
    const handleNotificationAction = (event: CustomEvent) => {
      const { action, data } = event.detail;
      
      // Only respond to view_result actions for OCR data that matches this file
      if (action === 'view_result' && data?.fileId === file.id) {
        console.log('Notification action received for file:', file.id, data);
        setShowResults(true);
      }
    };

    window.addEventListener('notification-action', handleNotificationAction as EventListener);
    
    return () => {
      window.removeEventListener('notification-action', handleNotificationAction as EventListener);
    };
  }, [file.id, setShowResults]);

  const isImage = pdfService.isImageFile(file.file_type);
  const isPDF = pdfService.isPDFFile(file.file_type);
  const isOCRSupported = pdfService.isOCRSupported(file.file_type);

  if (!isOCRSupported) return null;

  const handleProcessOCR = async (preprocessingOptions: any = {}) => {
    if (!file.url) {
      toast.error('File URL not available');
      return;
    }

    setIsConvertingFile(true);
    try {
      const imageFile = await convertUrlToFile(file.url, file.name, file.file_type);
      
      processOCR({
        fileId: file.id,
        imageFile,
        language: 'eng',
        preprocessing: preprocessingOptions,
        pdfPages: preprocessingOptions.pdfPages
      });
    } catch (error) {
      toast.error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConvertingFile(false);
    }
  };

  const handleQuickProcess = () => {
    if (isPDF) {
      setShowPDFSelector(true);
    } else {
      handleProcessOCR({});
    }
  };

  const handlePDFPagesSelected = (pages: number[]) => {
    setShowPDFSelector(false);
    handleProcessOCR({ pdfPages: pages });
  };

  const handleQuickSaved = () => {
    setShowQuickSave(false);
    clearLastResult();
    toast.success('Text saved to notes successfully!');
  };

  // Fix confidence calculation - handle both percentage (0-100) and decimal (0-1) values
  const getConfidencePercentage = (confidence: number | null | undefined): number => {
    return normalizeConfidence(confidence);
  };

  const getStatusDisplay = () => {
    if (isProcessing || isConvertingFile) {
      return <OCRProcessingState ocrJob={ocrJob} isConvertingFile={isConvertingFile} />;
    }
    
    switch (file.ocr_status) {
      case 'completed':
        // Don't show persistent badge for completed OCR - use toast notifications instead
        return null;
      case 'failed':
        return <Badge variant="destructive">OCR Failed</Badge>;
      case 'processing':
        return <OCRProcessingState ocrJob={ocrJob} isConvertingFile={false} />;
      default:
        return null;
    }
  };

  // Determine what text to show in the results
  const getResultsText = () => {
    if (lastOCRResult?.fileId === file.id && lastOCRResult.text) {
      return lastOCRResult.text;
    }
    return file.ocr_text || '';
  };

  const getResultsConfidence = () => {
    if (lastOCRResult?.fileId === file.id && lastOCRResult.confidence !== undefined) {
      return lastOCRResult.confidence;
    }
    return file.ocr_confidence;
  };

  return (
    <OCRErrorBoundary>
      <div className="relative flex items-center space-x-2">
        {getStatusDisplay()}
        
        {hasOCRText ? (
          <CompletedState
            variant={variant}
            size={size}
            onViewResults={() => setShowResults(true)}
            onQuickSave={() => setShowQuickSave(true)}
            onReProcess={() => setShowPDFSelector(true)}
            fileType={file.file_type}
          />
        ) : !isProcessing && !isConvertingFile && file.ocr_status !== 'processing' ? (
          <IdleState
            file={file}
            variant={variant}
            size={size}
            onQuickProcess={handleQuickProcess}
            onShowEditor={() => setShowEditor(true)}
          />
        ) : null}

        {/* Quick Save Popup */}
        {showQuickSave && (lastOCRResult?.fileId === file.id || hasOCRText) && (
          <div className="absolute top-full left-0 mt-2 z-50">
            <QuickSaveToNotes
              text={getResultsText()}
              fileName={file.name}
              onClose={handleQuickSaveClose}
              onSaved={handleQuickSaved}
            />
          </div>
        )}

        {showPDFSelector && isPDF && (
          <PDFPageSelector
            isOpen={showPDFSelector}
            onClose={() => setShowPDFSelector(false)}
            pdfFile={file}
            onPagesSelected={handlePDFPagesSelected}
            isProcessing={isProcessing}
            isReProcessing={!!hasOCRText}
          />
        )}

        {showEditor && file.url && isImage && (
          <ImageEditor
            imageUrl={file.url}
            fileName={file.name}
            onClose={() => setShowEditor(false)}
            onProcessOCR={handleProcessOCR}
          />
        )}

        {/* Show results for both existing OCR text and newly processed results */}
        {showResults && (hasOCRText || (lastOCRResult?.fileId === file.id)) && (
          <OCRTextEditor
            text={getResultsText()}
            confidence={getResultsConfidence()}
            fileName={file.name}
            onClose={() => setShowResults(false)}
          />
        )}
      </div>
    </OCRErrorBoundary>
  );
}
