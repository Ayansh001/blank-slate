
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { OCRJob } from '../types';

export function useOCRJobs() {
  const { user } = useAuth();

  const { data: ocrJobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['ocr-jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ocr_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OCRJob[];
    },
    enabled: !!user
  });

  const activeJobs = ocrJobs.filter(job => ['pending', 'processing'].includes(job.status));
  const completedJobs = ocrJobs.filter(job => ['completed', 'failed', 'cancelled'].includes(job.status));

  return {
    ocrJobs,
    activeJobs,
    completedJobs,
    isLoadingJobs
  };
}
