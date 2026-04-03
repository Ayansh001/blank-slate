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

class OpenAIConceptLearningService {
  private static instance: OpenAIConceptLearningService;
  private apiKey: string | null = null;
  private keySource: 'backend' | 'local' | 'none' = 'none';
  private userId: string | null = null;

  static getInstance(): OpenAIConceptLearningService {
    if (!OpenAIConceptLearningService.instance) {
      OpenAIConceptLearningService.instance = new OpenAIConceptLearningService();
    }
    return OpenAIConceptLearningService.instance;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.keySource = 'local';
    localStorage.setItem('openai-api-key', apiKey);
  }

  async getApiKey(userId?: string): Promise<string | null> {
    // 1. Check memory first
    if (this.apiKey && this.keySource !== 'none') {
      return this.apiKey;
    }
    
    // 2. Try backend key if user is provided
    if (userId) {
      const backendKey = await this.fetchBackendOpenAIKey(userId);
      if (backendKey) {
        this.apiKey = backendKey;
        this.keySource = 'backend';
        this.userId = userId;
        return backendKey;
      }
    }
    
    // 3. Fallback to localStorage
    const localKey = localStorage.getItem('openai-api-key');
    if (localKey) {
      this.apiKey = localKey;
      this.keySource = 'local';
      return localKey;
    }
    
    // 4. No key available
    this.keySource = 'none';
    return null;
  }

  private async fetchBackendOpenAIKey(userId: string): Promise<string | null> {
    try {
      const { AIServiceManager } = await import('@/features/ai/services/AIServiceManager');
      const aiServiceManager = AIServiceManager.getInstance();
      
      const configs = await aiServiceManager.getUserAIConfigs(userId);
      const openaiConfig = configs.find(config => 
        config.service_name === 'openai' && 
        config.is_active === true && 
        config.api_key
      );
      
      if (openaiConfig?.api_key) {
        return openaiConfig.api_key;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to fetch backend OpenAI key:', error);
      return null;
    }
  }

  getKeySource(): 'backend' | 'local' | 'none' {
    return this.keySource;
  }

  isUsingBackendKey(): boolean {
    return this.keySource === 'backend';
  }

  clearApiKey(): void {
    this.apiKey = null;
    this.keySource = 'none';
    this.userId = null;
    localStorage.removeItem('openai-api-key');
  }

  async testConnection(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return false;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private getSystemPrompt(): string {
    return `You are an advanced AI learning assistant specialized in comprehensive concept education. Your role is to provide detailed, structured explanations that facilitate deep understanding and practical application.

CRITICAL FORMATTING REQUIREMENTS:
- You MUST respond with ONLY valid JSON
- No markdown formatting, explanations, or additional text
- Ensure ALL string values are properly escaped for JSON

Required JSON structure:
{
  "concept": "string",
  "explanation": "string - comprehensive 300+ word explanation",
  "keyPoints": ["array", "of", "key", "concepts"],
  "studyTips": ["array", "of", "study", "strategies"],
  "examples": ["array", "of", "practical", "examples"],
  "relatedConcepts": [
    {
      "name": "concept name",
      "relationship": "how it relates"
    }
  ],
  "mindMap": {
    "center": "central concept",
    "branches": [
      {
        "topic": "branch topic",
        "subtopics": ["subtopic1", "subtopic2"]
      }
    ]
  },
  "knowledgeGraph": {
    "centralNode": "main concept",
    "connectedNodes": ["related concept 1", "related concept 2"]
  },
  "youtubeSearchQuery": "optimized search query for educational videos",
  "flashcardSummaries": [
    {
      "id": "unique-id",
      "shortSummary": "brief summary for flashcard front",
      "comprehensiveExplanation": "detailed explanation for flashcard back"
    }
  ]
}

CONTENT GUIDELINES:
- Provide comprehensive, accurate explanations
- Include practical examples and real-world applications
- Create effective study strategies
- Design flashcards that promote active recall
- Generate YouTube search queries that will find quality educational content
- Ensure all arrays have meaningful content (minimum 3 items each)
- Make connections between concepts clear and educational`;
  }

  async learnConcept(concept: string, userId?: string): Promise<ConceptLearningResponse> {
    const apiKey = await this.getApiKey(userId);
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: `Please provide a comprehensive learning explanation for the concept: "${concept}"` }
          ],
          temperature: 0.7,
          max_tokens: 6000
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Clean and parse JSON response
      const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      let parsedResult: ConceptLearningResponse;

      try {
        parsedResult = JSON.parse(cleanContent);
      } catch (parseError) {
        // Fallback response if JSON parsing fails
        parsedResult = this.createFallbackResponse(concept, content);
      }

      // Ensure flashcardSummaries exist
      if (!parsedResult.flashcardSummaries || parsedResult.flashcardSummaries.length === 0) {
        parsedResult.flashcardSummaries = this.generateFallbackFlashcards(concept, parsedResult);
      }

      // Fetch YouTube videos
      try {
        const youtubeResponse = await supabase.functions.invoke('youtube-search-handler', {
          body: { 
            query: parsedResult.youtubeSearchQuery || concept,
            maxResults: 5 
          }
        });
        
        if (youtubeResponse.data?.success && youtubeResponse.data?.videos) {
          parsedResult.youtubeVideos = youtubeResponse.data.videos;
        }
      } catch (error) {
        console.warn('YouTube integration failed:', error);
      }

      return parsedResult;

    } catch (error) {
      console.error('OpenAI Concept Learning error:', error);
      throw error;
    }
  }

  private createFallbackResponse(concept: string, content: string): ConceptLearningResponse {
    return {
      concept,
      explanation: content || `${concept} is an important concept that requires further study and understanding.`,
      keyPoints: [
        `Understanding ${concept} fundamentals`,
        `Practical applications of ${concept}`,
        `Key principles governing ${concept}`
      ],
      studyTips: [
        `Break down ${concept} into smaller components`,
        `Practice with real-world examples`,
        `Review and summarize key points regularly`
      ],
      examples: [
        `Example 1: Basic application of ${concept}`,
        `Example 2: Advanced use case of ${concept}`,
        `Example 3: Real-world implementation of ${concept}`
      ],
      relatedConcepts: [
        { name: "Foundational concepts", relationship: "Prerequisites for understanding" },
        { name: "Advanced topics", relationship: "Built upon this concept" }
      ],
      mindMap: {
        center: concept,
        branches: [
          { topic: "Fundamentals", subtopics: ["Definition", "Core principles"] },
          { topic: "Applications", subtopics: ["Use cases", "Examples"] }
        ]
      },
      knowledgeGraph: {
        centralNode: concept,
        connectedNodes: ["Related topic 1", "Related topic 2", "Advanced applications"]
      },
      youtubeSearchQuery: `${concept} explained tutorial`,
      flashcardSummaries: [
        {
          id: `concept-main-${concept}`,
          shortSummary: `What is ${concept}?`,
          comprehensiveExplanation: content.substring(0, 300) + '...'
        }
      ]
    };
  }

  private generateFallbackFlashcards(concept: string, result: ConceptLearningResponse): Array<{id: string, shortSummary: string, comprehensiveExplanation: string}> {
    const flashcards = [];

    // Main concept flashcard
    flashcards.push({
      id: `concept-main-${concept}`,
      shortSummary: result.explanation?.split('.')[0] + '.' || `Brief overview of ${concept}`,
      comprehensiveExplanation: result.explanation || `${concept} is a fundamental concept that requires deeper understanding through practical application and study.`
    });

    // Key points flashcards
    result.keyPoints?.forEach((point: string, index: number) => {
      flashcards.push({
        id: `keypoint-${index}-${concept}`,
        shortSummary: point.split('.')[0] + '.' || `Key aspect ${index + 1}`,
        comprehensiveExplanation: `${point} This is a crucial element of ${concept} that connects to broader principles and practical applications.`
      });
    });

    // Examples flashcards  
    result.examples?.slice(0, 2).forEach((example: string, index: number) => {
      flashcards.push({
        id: `example-${index}-${concept}`,
        shortSummary: `Example: ${example.substring(0, 50)}...`,
        comprehensiveExplanation: `${example} This example demonstrates practical application of ${concept} in real-world scenarios.`
      });
    });

    return flashcards;
  }
}

export const openAIConceptLearningService = OpenAIConceptLearningService.getInstance();