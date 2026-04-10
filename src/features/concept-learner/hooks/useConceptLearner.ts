
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { openAIConceptLearningService } from '@/services/OpenAIConceptLearningService';

interface ConceptData {
  concept: string;
  explanation: string;
  keyPoints: string[];
  studyTips: string[];
  examples: string[];
  relatedConcepts: Array<{
    name: string;
    relationship: string;
  }>;
  mindMap: {
    center: string;
    branches: Array<{
      topic: string;
      subtopics: string[];
    }>;
  };
  knowledgeGraph: {
    centralNode: string;
    connectedNodes: string[];
  };
  youtubeSearchQuery: string;
  youtubeVideos?: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
    description: string;
    embedId: string;
  }>;
  flashcardSummaries: Array<{
    id: string;
    shortSummary: string;
    comprehensiveExplanation: string;
  }>;
}

export function useConceptLearner() {
  const { user } = useAuth();
  const { configs, activeConfig } = useAIConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [conceptData, setConceptData] = useState<ConceptData | null>(null);
  const [actualProvider, setActualProvider] = useState<'openai' | 'gemini'>('gemini');
  const [useOpenAIFrontend, setUseOpenAIFrontend] = useState(false);
  const [keySource, setKeySource] = useState<'backend' | 'local' | 'none'>('none');

  const learnConcept = useCallback(async (concept: string, provider: 'openai' | 'gemini' = 'gemini') => {
    if (isLoading) return null;
    
    if (!concept.trim()) {
      toast.error('Please enter a concept to learn');
      return null;
    }
    
    setIsLoading(true);
    try {
      console.log('Learning concept with provider:', provider, 'Concept:', concept);
      
      // Update actual provider state
      setActualProvider(provider);

      let result;

      if (provider === 'openai') {
        // Always use backend for OpenAI
        setUseOpenAIFrontend(false);
        setKeySource('backend');
        
        const hasConfig = await openAIConceptLearningService.getApiKey(user?.id);
        if (hasConfig) {
          result = await openAIConceptLearningService.learnConcept(concept.trim(), user?.id);
        } else {
          // Fallback to dedicated backend function
          const { data, error } = await supabase.functions.invoke('openai-concept-learner-v2', {
            body: { concept: concept.trim() }
          });
          if (error) throw new Error(error.message);
          if (!data?.success || !data?.result) throw new Error('Failed to get concept explanation');
          result = data.result;
        }
      } else {
        // Use Gemini backend function
        setUseOpenAIFrontend(false);
        setKeySource('backend');
        const { data, error } = await supabase.functions.invoke('gemini-concept-learner-v2', {
          body: { concept: concept.trim() }
        });
        if (error) throw new Error(error.message);
        if (!data?.success || !data?.result) throw new Error('Failed to get concept explanation');
        result = data.result;
      }

      if (result) {
        
        // Ensure flashcardSummaries exist with comprehensive explanations
        if (!result.flashcardSummaries || result.flashcardSummaries.length === 0) {
          console.log('Generating flashcard summaries from concept data');
          result.flashcardSummaries = [];
          
          // Create comprehensive flashcard for main concept
          result.flashcardSummaries.push({
            id: `concept-main-${concept}`,
            shortSummary: result.explanation?.split('.')[0] + '.' || `Brief overview of ${concept}`,
            comprehensiveExplanation: result.explanation || `${concept} is a fundamental concept that requires deeper understanding through practical application and study.`
          });

          // Create flashcards for key points
          result.keyPoints?.forEach((point: string, index: number) => {
            result.flashcardSummaries.push({
              id: `keypoint-${index}-${concept}`,
              shortSummary: point.split('.')[0] + '.' || `Key aspect ${index + 1}`,
              comprehensiveExplanation: `${point} This is a crucial element of ${concept} that connects to broader principles and practical applications. Understanding this helps build a complete mental model of the concept.`
            });
          });

          // Create flashcards for examples
          result.examples?.forEach((example: string, index: number) => {
            result.flashcardSummaries.push({
              id: `example-${index}-${concept}`,
              shortSummary: `Example: ${example.substring(0, 50)}...`,
              comprehensiveExplanation: `${example} This example demonstrates practical application of ${concept} in real-world scenarios. By studying concrete examples like this, you can better understand how theoretical concepts translate into practice.`
            });
          });

          // Create flashcards for study tips
          result.studyTips?.forEach((tip: string, index: number) => {
            result.flashcardSummaries.push({
              id: `tip-${index}-${concept}`,
              shortSummary: `Study strategy: ${tip.substring(0, 40)}...`,
              comprehensiveExplanation: `${tip} This study approach is particularly effective for ${concept} because it aligns with how the human brain processes and retains complex information. Implementing this strategy will improve your long-term retention and understanding.`
            });
          });
        }

        // Client-side YouTube enrichment if missing videos
        if (!result.youtubeVideos && result.youtubeSearchQuery) {
          try {
            const { data: youtubeData } = await supabase.functions.invoke('youtube-search-handler', {
              body: { 
                query: result.youtubeSearchQuery,
                maxResults: 5 
              }
            });
            
            if (youtubeData?.success && youtubeData?.videos) {
              result.youtubeVideos = youtubeData.videos;
            }
          } catch (error) {
            console.warn('YouTube enrichment failed:', error);
          }
        }
        
        console.log('Enhanced concept data with flashcard summaries:', result);
        setConceptData(result);
        const sourceMessage = useOpenAIFrontend ? 
          (keySource === 'backend' ? ' (backend key)' : ' (local key)') : 
          ' (backend service)';
        toast.success(`Concept explanation generated${sourceMessage} with comprehensive details!`);
        return result;
      }
    } catch (err: any) {
      console.error('Concept learning error:', { message: err.message, code: err.code, diagnostics: err.diagnostics });
      
      // Use classified error code for specific user feedback
      const errorCode = err.code || '';
      let title = 'Concept learning failed';
      if (errorCode === 'invalid_key') title = 'Invalid API key';
      else if (errorCode === 'quota_exceeded') title = 'API quota exceeded';
      else if (errorCode === 'rate_limited') title = 'Rate limited';
      else if (errorCode === 'network_error') title = 'Network error';
      else if (errorCode === 'invalid_model') title = 'Invalid model';
      
      toast.error(title, {
        description: err.message || 'Please try again'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, configs]);

  return {
    isLoading,
    conceptData,
    learnConcept,
    setConceptData,
    actualProvider,
    useOpenAIFrontend,
    keySource
  };
}
