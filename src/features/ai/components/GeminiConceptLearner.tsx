import React, { useState, useEffect } from 'react';
import { EnhancedConceptLearner } from '@/features/concept-learner/components/EnhancedConceptLearner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface GeminiConceptLearnerProps {
  initialConcept?: string;
}

export function GeminiConceptLearner({ initialConcept = '' }: GeminiConceptLearnerProps) {
  const { user } = useAuth();
  const [detectedProvider, setDetectedProvider] = useState<'openai' | 'gemini'>('gemini');

  useEffect(() => {
    const detectActiveProvider = async () => {
      if (!user) return;

      try {
        const { data: activeConfig } = await supabase
          .from('ai_service_configs')
          .select('service_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (activeConfig?.service_name) {
          const serviceName = activeConfig.service_name.toLowerCase();
          if (serviceName === 'openai' || serviceName === 'gemini') {
            setDetectedProvider(serviceName);
          }
        }
      } catch (error) {
        console.warn('Failed to detect provider, using default:', error);
      }
    };

    detectActiveProvider();
  }, [user]);

  return (
    <EnhancedConceptLearner 
      initialConcept={initialConcept}
      provider={detectedProvider}
    />
  );
}