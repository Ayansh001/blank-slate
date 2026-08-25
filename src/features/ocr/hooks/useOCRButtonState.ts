
import { useState, useEffect } from 'react';
import { FileData } from '@/hooks/useFiles';
import { useOCRProcessor } from './useOCRProcessor';
import { useOCR } from './useOCR';

interface OCRButtonStateOptions {
  file: FileData;
}

export function useOCRButtonState({ file }: OCRButtonStateOptions) {
  const { ocrJobs, isServiceProcessing } = useOCR();
  
  const [showEditor, setShowEditor] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [showPDFSelector, setShowPDFSelector] = useState(false);
  const [isConvertingFile, setIsConvertingFile] = useState(false);

  // Remove onViewResults callback to prevent auto-opening
  const { processingFiles, lastOCRResult, clearLastResult } = useOCRProcessor();

  const isProcessing = processingFiles.has(file.id) || isServiceProcessing;
  const hasOCRText = file.ocr_status === 'completed' && file.ocr_text;
  const ocrJob = ocrJobs.find(job => job.file_id === file.id);

  // Remove automatic display of results/quicksave after OCR completion
  // Let users control when to view via toast notification
  useEffect(() => {
    // Removed automatic popup logic - users can now choose when to view results
    // via the toast notification "View Text" button
  }, [lastOCRResult, file.id]);

  const closeAllModals = () => {
    setShowEditor(false);
    setShowResults(false);
    setShowQuickSave(false);
    setShowPDFSelector(false);
  };

  const handleQuickSaveClose = () => {
    setShowQuickSave(false);
    clearLastResult();
  };

  return {
    // State
    showEditor,
    showResults,
    showQuickSave,
    showPDFSelector,
    isConvertingFile,
    isProcessing,
    hasOCRText,
    ocrJob,
    lastOCRResult,
    
    // Actions
    setShowEditor,
    setShowResults,
    setShowQuickSave,
    setShowPDFSelector,
    setIsConvertingFile,
    closeAllModals,
    handleQuickSaveClose,
    clearLastResult
  };
}
