
import { useState, useCallback } from 'react';
import { OCRProcessorFactory } from '../processors/OCRProcessorFactory';
import { OCRDatabaseService } from '../services/OCRDatabaseService';
import { NotificationService } from '@/services/NotificationService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { OCRJob, OCRResult } from '../types';
import { toast } from 'sonner';

interface OCRProcessorConfig {
  onJobUpdate?: (job: OCRJob) => void;
  onComplete?: (result: OCRResult) => void;
  onError?: (error: Error) => void;
  onViewResults?: () => void;
}

export interface ProcessOCRParams {
  fileId: string;
  imageFile: File;
  language?: string;
  preprocessing?: any;
  pdfPages?: number[];
}

export function useOCRProcessor(config: OCRProcessorConfig = {}) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<OCRJob | null>(null);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [lastOCRResult, setLastOCRResult] = useState<OCRResult & { fileId: string } | null>(null);

  const processOCR = useCallback(async (params: ProcessOCRParams) => {
    const { fileId, imageFile, language = 'eng', preprocessing = {}, pdfPages } = params;
    
    // Check if user is authenticated
    if (!user) {
      const error = new Error('User not authenticated');
      config.onError?.(error);
      toast.error('Please log in to use OCR');
      throw error;
    }
    
    console.log('OCR Processing started:', { 
      fileId, 
      fileName: imageFile.name, 
      fileType: imageFile.type, 
      language, 
      pdfPages,
      fileSize: imageFile.size,
      userId: user.id
    });
    
    setIsProcessing(true);
    setProcessingFiles(prev => new Set(prev).add(fileId));
    
    try {
      // Create OCR job with actual user ID
      const job: OCRJob = {
        id: `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file_id: fileId,
        user_id: user.id, // ✅ Use actual user ID
        status: 'pending',
        progress: 0,
        language,
        preprocessing_options: preprocessing,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCurrentJob(job);
      config.onJobUpdate?.(job);

      // Update job status to processing
      const processingJob = { ...job, status: 'processing' as const, updated_at: new Date().toISOString() };
      setCurrentJob(processingJob);
      config.onJobUpdate?.(processingJob);

      // Use OCRProcessorFactory for unified processing (handles both images and PDFs)
      console.log('Using OCRProcessorFactory for processing');
      const result = await OCRProcessorFactory.process({
        fileId,
        imageFile,
        language,
        preprocessing,
        pdfPages,
        onProgress: (progress) => {
          console.log('OCR Progress update:', progress);
          const updatedJob = { ...processingJob, progress, updated_at: new Date().toISOString() };
          setCurrentJob(updatedJob);
          config.onJobUpdate?.(updatedJob);
        }
      });

      console.log('OCR Processing completed:', { 
        textLength: result.text.length, 
        confidence: result.confidence,
        pageCount: result.pageCount 
      });

      // Save to database with actual user ID
      await OCRDatabaseService.saveOCRResults({
        fileId,
        userId: user.id, // ✅ Use actual user ID
        text: result.text,
        confidence: result.confidence,
        language
      });

      // Complete job
      const completedJob = { 
        ...processingJob, 
        status: 'completed' as const, 
        progress: 100, 
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setCurrentJob(completedJob);
      config.onJobUpdate?.(completedJob);

      // Set last result
      setLastOCRResult({ ...result, fileId });

      // Trigger OCR completion notification with file info
      console.log('Triggering OCR completion notification for:', imageFile.name);
      NotificationService.ocrCompleted(imageFile.name, result.text.length, fileId);

      // Call completion callbacks
      config.onComplete?.(result);
      config.onViewResults?.();

      // Removed duplicate toast.success() call - notification service handles this
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'OCR processing failed';
      console.error('OCR processing error:', { error: errorMsg, fileId, fileName: imageFile.name, userId: user?.id });
      
      // Update job with error
      if (currentJob) {
        const errorJob = { 
          ...currentJob, 
          status: 'failed' as const, 
          error_message: errorMsg,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCurrentJob(errorJob);
        config.onJobUpdate?.(errorJob);
      }

      // Trigger error notification
      console.log('Triggering OCR error notification for:', imageFile.name);
      NotificationService.systemAlert(
        `OCR processing failed for ${imageFile.name}: ${errorMsg}`,
        'error'
      );

      config.onError?.(error instanceof Error ? error : new Error(errorMsg));
      toast.error(`OCR failed: ${errorMsg}`);
      
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      
      // Clear job after delay
      setTimeout(() => {
        setCurrentJob(null);
      }, 3000);
    }
  }, [config, currentJob, user]);

  // Add processOCRAsync as an alias for processOCR
  const processOCRAsync = processOCR;

  const cancelProcessing = useCallback(() => {
    if (currentJob) {
      setCurrentJob(null);
      setIsProcessing(false);
      toast.info('OCR processing cancelled');
    }
  }, [currentJob]);

  const clearLastResult = useCallback(() => {
    setLastOCRResult(null);
  }, []);

  return {
    processOCR,
    processOCRAsync,
    cancelProcessing,
    isProcessing,
    currentJob,
    processingFiles,
    lastOCRResult,
    clearLastResult
  };
}
