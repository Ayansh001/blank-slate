import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { AIProviderFactory } from '@/features/ai/providers/AIProviderFactory';

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

  /**
   * Get the API key for a given provider from the unified ai_service_configs table.
   * Falls back to activeConfig if the requested provider matches.
   */
  const getApiKeyForProvider = useCallback((provider: 'openai' | 'gemini'): { apiKey: string; model: string } | null => {
    // First check if active config matches the provider
    if (activeConfig && activeConfig.service_name === provider && activeConfig.api_key) {
      return { apiKey: activeConfig.api_key, model: activeConfig.model_name };
    }
    // Otherwise search all configs
    const config = configs.find(c => c.service_name === provider && c.api_key);
    if (config) {
      return { apiKey: config.api_key!, model: config.model_name };
    }
    return null;
  }, [configs, activeConfig]);

  const learnConcept = useCallback(async (concept: string, provider: 'openai' | 'gemini' = 'gemini') => {
    if (isLoading) return null;
    
    if (!concept.trim()) {
      toast.error('Please enter a concept to learn');
      return null;
    }
    
    setIsLoading(true);
    try {
      console.log('Learning concept with provider:', provider, 'Concept:', concept);
      setActualProvider(provider);

      // Get API key from unified config source
      const providerConfig = getApiKeyForProvider(provider);

      let result;

      if (providerConfig) {
        // Use client-side direct API call (unified flow)
        setUseOpenAIFrontend(true);
        setKeySource('backend');

        const aiProvider = AIProviderFactory.createProvider({
          provider,
          apiKey: providerConfig.apiKey,
          model: provider === 'gemini' 
            ? (providerConfig.model || 'gemini-2.0-flash') 
            : (providerConfig.model || 'gpt-4o-mini'),
        });

        const promptText = buildConceptPrompt(concept);
        const response = await aiProvider.generateResponse({
          prompt: promptText,
          systemPrompt: 'You are an intelligent AI tutor integrated into StudyVault. Always respond with valid JSON.',
          maxTokens: 6000,
          temperature: 0.7,
        });

        // Parse JSON from response
        let cleanContent = response.content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        try {
          result = JSON.parse(cleanContent);
        } catch {
          // Fallback structured response
          result = buildFallbackResult(concept, response.content);
        }
      } else {
        // Fallback to edge functions (uses server-side env keys)
        setUseOpenAIFrontend(false);
        setKeySource('none');

        const edgeFunction = provider === 'openai' ? 'openai-concept-learner-v2' : 'gemini-concept-learner-v2';
        const { data, error } = await supabase.functions.invoke(edgeFunction, {
          body: { concept: concept.trim() }
        });

        if (error) throw new Error(error.message);
        if (!data?.success || !data?.result) {
          throw new Error('Failed to get concept explanation');
        }
        result = data.result;
      }

      if (result) {
        // Ensure flashcardSummaries exist
        if (!result.flashcardSummaries || result.flashcardSummaries.length === 0) {
          result.flashcardSummaries = generateFallbackFlashcards(concept, result);
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
        
        setConceptData(result);
        toast.success('Concept explanation generated with comprehensive details!');
        return result;
      }
    } catch (err: any) {
      console.error('Concept learning error:', err);
      toast.error('Concept learning failed', {
        description: err.message || 'Please try again'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, configs, activeConfig, getApiKeyForProvider, isLoading]);

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

function buildConceptPrompt(concept: string): string {
  return `Create a complete educational package for the concept: "${concept}"

Please respond with a valid JSON object containing exactly these fields:

{
  "concept": "The main concept name",
  "explanation": "A clear, engaging explanation in 3-5 paragraphs",
  "keyPoints": ["4-7 essential takeaways"],
  "studyTips": ["2-4 proven learning strategies"],
  "examples": ["2-3 concrete examples"],
  "relatedConcepts": [{"name": "Related Concept", "relationship": "How it connects"}],
  "mindMap": {
    "center": "${concept}",
    "branches": [
      {"topic": "Core Definition", "subtopics": ["fundamental aspects", "key characteristics"]},
      {"topic": "Real Examples", "subtopics": ["practical applications", "everyday instances"]},
      {"topic": "Key Applications", "subtopics": ["where it's used", "why it matters"]},
      {"topic": "Important Terms", "subtopics": ["vocabulary", "technical concepts"]},
      {"topic": "Related Ideas", "subtopics": ["connected concepts", "broader context"]}
    ]
  },
  "knowledgeGraph": {
    "centralNode": "${concept}",
    "connectedNodes": ["5-7 related topics"]
  },
  "youtubeSearchQuery": "optimized search for educational videos about ${concept}",
  "flashcardSummaries": [
    {
      "id": "concept-main-${concept}",
      "shortSummary": "Concise 1-2 sentence summary",
      "comprehensiveExplanation": "Detailed 3-4 paragraph explanation with practical applications"
    }
  ]
}

CRITICAL: Generate flashcard summaries for each key point, example, and study tip. Each comprehensiveExplanation should be 150-300 words. Respond with valid JSON only.`;
}

function buildFallbackResult(concept: string, content: string) {
  return {
    concept,
    explanation: content,
    keyPoints: [`Key aspects of ${concept}`],
    studyTips: [`Study tip for ${concept}`],
    examples: [`Example application of ${concept}`],
    relatedConcepts: [{ name: "Related topic", relationship: "Connected concept" }],
    mindMap: {
      center: concept,
      branches: [
        { topic: "Definition", subtopics: ["Basic meaning"] },
        { topic: "Examples", subtopics: ["Real-world use"] }
      ]
    },
    knowledgeGraph: {
      centralNode: concept,
      connectedNodes: ["Related topic 1", "Related topic 2"]
    },
    youtubeSearchQuery: `${concept} explained tutorial`,
    flashcardSummaries: [
      {
        id: `concept-main-${concept}`,
        shortSummary: `Brief overview of ${concept}`,
        comprehensiveExplanation: content.substring(0, 500) + '...'
      }
    ]
  };
}

function generateFallbackFlashcards(concept: string, result: any) {
  const flashcards = [];
  
  flashcards.push({
    id: `concept-main-${concept}`,
    shortSummary: result.explanation?.split('.')[0] + '.' || `Brief overview of ${concept}`,
    comprehensiveExplanation: result.explanation || `${concept} is a fundamental concept that requires deeper understanding.`
  });

  result.keyPoints?.forEach((point: string, index: number) => {
    flashcards.push({
      id: `keypoint-${index}-${concept}`,
      shortSummary: point.split('.')[0] + '.',
      comprehensiveExplanation: `${point} This is a crucial element of ${concept} that connects to broader principles and practical applications.`
    });
  });

  result.examples?.forEach((example: string, index: number) => {
    flashcards.push({
      id: `example-${index}-${concept}`,
      shortSummary: `Example: ${example.substring(0, 50)}...`,
      comprehensiveExplanation: `${example} This example demonstrates practical application of ${concept}.`
    });
  });

  result.studyTips?.forEach((tip: string, index: number) => {
    flashcards.push({
      id: `tip-${index}-${concept}`,
      shortSummary: `Study strategy: ${tip.substring(0, 40)}...`,
      comprehensiveExplanation: `${tip} This study approach is effective for ${concept}.`
    });
  });

  return flashcards;
}
