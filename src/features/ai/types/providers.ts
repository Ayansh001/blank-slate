
export type AIServiceProvider = 'openai' | 'anthropic' | 'gemini';
export type AIProvider = AIServiceProvider; // Alias for backward compatibility

export interface AIServiceConfig {
  id?: string;
  user_id: string;
  provider: AIServiceProvider;
  api_key: string;
  model: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIProviderConfig {
  provider: AIServiceProvider;
  apiKey: string;
  model: string;
}

export interface AIResponse {
  content: string;
  questions?: any; // Added for quiz compatibility
  usage?: {
    tokens: number;
    cost?: number;
  };
  metadata?: any;
}

export interface GenerateOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface QuizGenerationOptions {
  topic: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
}

// Enhanced EnhancementResult interface with all required metadata properties
export interface EnhancementResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: string;
  model?: string;
  processingTime?: number;
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    provider?: string;
  };
}

export interface AIProviderInterface {
  generateResponse(options: GenerateOptions): Promise<AIResponse>;
  generateQuiz(content: string): Promise<AIResponse>; // Fixed method signature
  enhanceText(content: string): Promise<string>;
  validateConnection(): Promise<boolean>;
  getCapabilities(): string[];
  
  // Methods that return unwrapped data for direct use in modules
  generateKeyPoints(content: string): Promise<string[]>;
  generateQuestions(content: string): Promise<string[]>;
  generateSummary(content: string): Promise<string>;
}

export interface ServiceCapabilities {
  textGeneration: boolean;
  quizGeneration: boolean;
  noteEnhancement: boolean;
  chatSupport: boolean;
  imageGeneration: boolean;
  fileProcessing: boolean;
  maxTokens: number;
  supportedModels: string[];
}
