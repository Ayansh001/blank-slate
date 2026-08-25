import React, { useEffect, useState } from 'react';
import { GeminiConceptLearner } from './GeminiConceptLearner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface ConceptLearnerWrapperProps {
  initialConcept?: string;
}

export function ConceptLearnerWrapper({ initialConcept = '' }: ConceptLearnerWrapperProps) {
  const { user } = useAuth();
  const [activeService, setActiveService] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectActiveService = async () => {
      if (!user) {
        setError('Please sign in to use the concept learner');
        setLoading(false);
        return;
      }

      try {
        const { data: activeConfig, error: configError } = await supabase
          .from('ai_service_configs')
          .select('service_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (configError) {
          console.error('Error fetching AI config:', configError);
          setError('Failed to detect AI service configuration');
          setLoading(false);
          return;
        }

        if (!activeConfig) {
          setError('No active AI service configured. Please configure an AI service first.');
          setLoading(false);
          return;
        }

        const serviceName = activeConfig.service_name.toLowerCase();
        if (serviceName === 'openai' || serviceName === 'gemini') {
          setActiveService(serviceName);
        } else {
          setError(`Unsupported AI service: ${activeConfig.service_name}`);
        }
      } catch (err) {
        console.error('Error detecting active service:', err);
        setError('Failed to detect active AI service');
      } finally {
        setLoading(false);
      }
    };

    detectActiveService();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Detecting AI service...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Configuration Required
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please go to the AI Chat section and configure your preferred AI service (OpenAI or Gemini) 
            before using the concept learner.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Both OpenAI and Gemini now use the unified concept learner approach
  // The backend functions handle the provider-specific logic
  if (activeService === 'openai' || activeService === 'gemini') {
    return <GeminiConceptLearner initialConcept={initialConcept} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Unsupported Service
        </CardTitle>
        <CardDescription>
          The concept learner currently supports OpenAI and Gemini only.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}