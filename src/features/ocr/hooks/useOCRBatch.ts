
import { useCallback } from 'react';
import { useOCRProcessor } from './useOCRProcessor';
import { validateBatchFiles } from '../utils/fileValidation';
import { toast } from 'sonner';

export function useOCRBatch() {
  const { processOCRAsync } = useOCRProcessor();

  const batchProcessOCR = useCallback(async (
    files: Array<{ fileId: string; imageFile: File }>,
    options: { language?: string; preprocessing?: any } = {}
  ) => {
    // Validate all files before processing
    const imageFiles = files.map(f => f.imageFile);
    const validation = validateBatchFiles(imageFiles);
    
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid files selected');
      return { results: [], errors: [{ error: validation.error }] };
    }

    if (validation.warnings) {
      validation.warnings.forEach(warning => {
        toast.warning(warning);
      });
    }

    const results = [];
    const errors = [];
    const total = files.length;

    toast.info(`Starting batch OCR processing for ${total} files...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await processOCRAsync({
          fileId: file.fileId,
          imageFile: file.imageFile,
          ...options
        });
        results.push(result);
        
        // Update progress
        const progress = Math.round(((i + 1) / total) * 100);
        toast.info(`Batch progress: ${progress}% (${i + 1}/${total})`);
      } catch (error) {
        console.error(`Failed to process OCR for file ${file.fileId}:`, error);
        errors.push({ 
          fileId: file.fileId, 
          fileName: file.imageFile.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Show final results
    if (errors.length > 0) {
      toast.error(`${errors.length} files failed to process. ${results.length} completed successfully.`);
    } else {
      toast.success(`All ${results.length} files processed successfully!`);
    }

    return { results, errors };
  }, [processOCRAsync]);

  return {
    batchProcessOCR
  };
}
