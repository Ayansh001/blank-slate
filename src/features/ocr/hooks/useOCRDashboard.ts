
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOCR } from './useOCR';

export function useOCRDashboard() {
  const { user } = useAuth();
  const { cancelOCR, isCancelling } = useOCR();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Fetch the file data for the selected job to get OCR results
  const { data: selectedJobFile } = useQuery({
    queryKey: ['ocr-job-file', selectedJobId],
    queryFn: async () => {
      if (!selectedJobId || !user) return null;

      const { data: jobData, error: jobError } = await supabase
        .from('ocr_jobs')
        .select('file_id')
        .eq('id', selectedJobId)
        .eq('user_id', user.id)
        .single();

      if (jobError) throw jobError;

      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('ocr_text, ocr_confidence, name')
        .eq('id', jobData.file_id)
        .eq('user_id', user.id)
        .single();

      if (fileError) throw fileError;
      return fileData;
    },
    enabled: !!selectedJobId && !!user
  });

  return {
    selectedJobId,
    setSelectedJobId,
    selectedJobFile,
    cancelOCR,
    isCancelling
  };
}
