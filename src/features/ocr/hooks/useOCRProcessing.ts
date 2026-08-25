
import { useOCRProcessor } from './useOCRProcessor';

// Re-export the processor hook for backward compatibility
export function useOCRProcessing() {
  return useOCRProcessor();
}
