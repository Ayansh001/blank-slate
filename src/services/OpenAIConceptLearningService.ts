import { supabase } from '@/integrations/supabase/client';

export interface ConceptLearningResponse {
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

export class ConceptLearningError extends Error {
  code: string;
  diagnostics?: Record<string, unknown>;

  constructor(message: string, code: string, diagnostics?: Record<string, unknown>) {
    super(message);
    this.name = 'ConceptLearningError';
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

class OpenAIConceptLearningService {
  private static instance: OpenAIConceptLearningService;

  static getInstance(): OpenAIConceptLearningService {
    if (!OpenAIConceptLearningService.instance) {
      OpenAIConceptLearningService.instance = new OpenAIConceptLearningService();
    }
    return OpenAIConceptLearningService.instance;
  }

  getKeySource(): 'backend' | 'local' | 'none' {
    return 'backend';
  }

  isUsingBackendKey(): boolean {
    return true;
  }

  async getApiKey(userId?: string): Promise<string | null> {
    if (!userId) return null;
    
    try {
      const { data } = await supabase
        .from('ai_service_configs')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      
      return data ? 'server-resolved' : null;
    } catch {
      return null;
    }
  }

  setApiKey(_apiKey: string): void {
    // No-op: keys are resolved server-side
  }

  clearApiKey(): void {
    localStorage.removeItem('openai-api-key');
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('concept-learner-handler', {
        body: { prompt: 'Hello', mode: 'basic-concept' }
      });
      // Edge function now always returns 200, check success field
      if (error) return false;
      return data?.success === true;
    } catch {
      return false;
    }
  }

  async learnConcept(concept: string, _userId?: string): Promise<ConceptLearningResponse> {
    const { data, error } = await supabase.functions.invoke('concept-learner-handler', {
      body: { 
        prompt: concept, 
        mode: 'advanced-concept-learning' 
      }
    });

    // Handle transport-level errors (network failures, CORS, etc.)
    if (error) {
      console.error('[ConceptLearning] Transport error:', error);
      throw new ConceptLearningError(
        'Network error connecting to AI service. Please try again.',
        'network_error'
      );
    }

    // Handle classified errors from edge function (now returns 200 with success: false)
    if (!data?.success) {
      const errorCode = data?.code || 'unknown_error';
      const errorMessage = data?.error || 'Failed to get concept explanation';
      console.error('[ConceptLearning] Classified error:', { code: errorCode, message: errorMessage, diagnostics: data?.diagnostics });
      throw new ConceptLearningError(errorMessage, errorCode, data?.diagnostics);
    }

    if (!data?.result) {
      throw new ConceptLearningError('Empty response from AI service', 'empty_response');
    }

    const result = data.result;

    // Ensure flashcardSummaries exist
    if (!result.flashcardSummaries || result.flashcardSummaries.length === 0) {
      result.flashcardSummaries = this.generateFallbackFlashcards(concept, result);
    }

    // Client-side YouTube enrichment if missing videos
    if (!result.youtubeVideos && result.youtubeSearchQuery) {
      try {
        const { data: youtubeData } = await supabase.functions.invoke('youtube-search-handler', {
          body: { query: result.youtubeSearchQuery, maxResults: 5 }
        });
        if (youtubeData?.success && youtubeData?.videos) {
          result.youtubeVideos = youtubeData.videos;
        }
      } catch (err) {
        console.warn('YouTube integration failed:', err);
      }
    }

    return result;
  }

  private generateFallbackFlashcards(concept: string, result: ConceptLearningResponse): Array<{id: string, shortSummary: string, comprehensiveExplanation: string}> {
    const flashcards = [];

    flashcards.push({
      id: `concept-main-${concept}`,
      shortSummary: result.explanation?.split('.')[0] + '.' || `Brief overview of ${concept}`,
      comprehensiveExplanation: result.explanation || `${concept} is a fundamental concept that requires deeper understanding.`
    });

    result.keyPoints?.forEach((point: string, index: number) => {
      flashcards.push({
        id: `keypoint-${index}-${concept}`,
        shortSummary: point.split('.')[0] + '.' || `Key aspect ${index + 1}`,
        comprehensiveExplanation: `${point} This is a crucial element of ${concept}.`
      });
    });

    result.examples?.slice(0, 2).forEach((example: string, index: number) => {
      flashcards.push({
        id: `example-${index}-${concept}`,
        shortSummary: `Example: ${example.substring(0, 50)}...`,
        comprehensiveExplanation: `${example} This demonstrates practical application of ${concept}.`
      });
    });

    return flashcards;
  }
}

export const openAIConceptLearningService = OpenAIConceptLearningService.getInstance();
