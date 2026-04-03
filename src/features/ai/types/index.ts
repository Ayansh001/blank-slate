// AI Feature Types - Isolated and modular as per project guidelines

export interface AIServiceConfig {
  id: string;
  user_id: string;
  service_name: string;
  api_key?: string;
  model_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentAnalysis {
  id: string;
  file_id: string;
  user_id: string;
  analysis_type: string;
  ai_service: string;
  model_used: string;
  prompt_used?: string;
  analysis_result: any;
  confidence_score?: number;
  processing_time_ms?: number;
  token_usage?: any;
  created_at: string;
  updated_at: string;
}

export interface AIChatSession {
  id: string;
  user_id: string;
  session_name: string;
  ai_service: string;
  model_used: string;
  system_prompt?: string;
  total_messages: number;
  total_tokens_used: number;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  token_count?: number;
  created_at: string;
}

export interface AIUsageTracking {
  id: string;
  user_id: string;
  service_name: string;
  operation_type: string;
  tokens_used: number;
  cost_estimate?: number;
  date: string;
  created_at: string;
}

export interface TokenUsage {
  [key: string]: any;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface AIAnalysisRequest {
  fileId: string;
  analysisType: 'summary' | 'key_points' | 'questions' | 'concepts' | 'topics';
  customPrompt?: string;
  aiService?: string;
  model?: string;
}

export interface AIAnalysisResult {
  success: boolean;
  analysis?: DocumentAnalysis;
  error?: string;
}

export interface AIChatRequest {
  sessionId?: string;
  message: string;
  fileReferences?: string[];
  systemPrompt?: string;
}

export interface AIChatResponse {
  success: boolean;
  message?: AIChatMessage;
  session?: AIChatSession;
  error?: string;
}

export type AIServiceProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIServiceCapabilities {
  models: string[];
  maxTokens: number;
  supportsVision: boolean;
  supportsStreaming: boolean;
  costPerToken: {
    input: number;
    output: number;
  };
}