
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ocrService } from '../services/OCRService';
import { useOCRJobs } from './useOCRJobs';
import { toast } from 'sonner';

export function useOCR() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get OCR jobs data
  const { ocrJobs, activeJobs, completedJobs, isLoadingJobs } = useOCRJobs();

  // Cancel OCR job
  const cancelOCRMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('ocr_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocr-jobs'] });
      toast.success('OCR job cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel OCR job: ' + error.message);
    }
  });

  return {
    // Jobs data
    ocrJobs,
    activeJobs,
    completedJobs,
    isLoadingJobs,
    
    // Job management
    cancelOCR: cancelOCRMutation.mutate,
    isCancelling: cancelOCRMutation.isPending,
    
    // Service methods
    supportedLanguages: ocrService.getSupportedLanguages(),
    getLanguageName: ocrService.getLanguageName.bind(ocrService),
    isServiceProcessing: ocrService.isCurrentlyProcessing()
  };
}
