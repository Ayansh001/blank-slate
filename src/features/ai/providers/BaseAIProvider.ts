
import { AIProviderInterface, AIResponse, GenerateOptions, QuizGenerationOptions, AIProviderConfig, EnhancementResult } from '../types/providers';
import { logger } from '../utils/DebugLogger';

export abstract class BaseAIProvider implements AIProviderInterface {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract generateResponse(options: GenerateOptions): Promise<AIResponse>;
  abstract validateConnection(): Promise<boolean>;
  abstract getCapabilities(): string[];

  // Fixed generateQuiz to accept content string and return AIResponse with questions
  async generateQuiz(content: string): Promise<AIResponse> {
    try {
      const response = await this.generateResponse({
        prompt: `Create a multiple choice quiz based on the following content. Return only valid JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]}. Content: ${content}`,
        maxTokens: 2000,
        temperature: 0.7,
        systemPrompt: 'You are an expert educator who creates high-quality multiple choice questions. Always return valid JSON format.'
      });

      // Parse the JSON response and ensure it has the right structure
      try {
        const parsedContent = JSON.parse(response.content);
        return {
          ...response,
          questions: parsedContent.questions || parsedContent
        };
      } catch (parseError) {
        // If JSON parsing fails, create a basic structure
        return {
          ...response,
          questions: []
        };
      }
    } catch (error) {
      logger.error('BaseAIProvider', 'Quiz generation failed', error);
      throw new Error('Failed to generate quiz');
    }
  }

  // Default implementation for enhanceText - can be overridden by specific providers
  async enhanceText(content: string): Promise<string> {
    try {
      const response = await this.generateResponse({
        prompt: `Please enhance and improve the following text while maintaining its core meaning and structure:\n\n${content}`,
        maxTokens: 2000,
        temperature: 0.7,
        systemPrompt: 'You are an expert editor who improves text clarity, grammar, and structure while preserving the original meaning.'
      });
      
      return response.content;
    } catch (error) {
      logger.error('BaseAIProvider', 'Text enhancement failed', error);
      throw new Error('Failed to enhance text');
    }
  }

  // Implementation for generateKeyPoints - returns unwrapped string array
  async generateKeyPoints(content: string): Promise<string[]> {
    try {
      const response = await this.generateResponse({
        prompt: `Extract the key points from the following content as a bulleted list:\n\n${content}`,
        maxTokens: 1000,
        temperature: 0.5,
        systemPrompt: 'You are an expert at identifying key points and important information from text. Return clear, concise bullet points.'
      });

      // Parse the response to extract key points
      const keyPoints = response.content
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.trim().replace(/^[•\-\*]\s*/, ''))
        .filter(point => point.length > 0);

      return keyPoints.length > 0 ? keyPoints : [response.content];
    } catch (error) {
      logger.error('BaseAIProvider', 'Key points generation failed', error);
      throw new Error('Failed to generate key points');
    }
  }

  // Implementation for generateQuestions - returns unwrapped string array
  async generateQuestions(content: string): Promise<string[]> {
    try {
      const response = await this.generateResponse({
        prompt: `Generate 5-10 thoughtful questions based on the following content:\n\n${content}`,
        maxTokens: 1000,
        temperature: 0.6,
        systemPrompt: 'You are an expert educator who creates insightful questions to help students think critically about content.'
      });

      // Parse questions from response
      const questions = response.content
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./) || line.trim().endsWith('?'))
        .map(line => line.trim().replace(/^\d+\.\s*/, ''))
        .filter(question => question.length > 0);

      return questions.length > 0 ? questions : [response.content];
    } catch (error) {
      logger.error('BaseAIProvider', 'Questions generation failed', error);
      throw new Error('Failed to generate questions');
    }
  }

  // Implementation for generateSummary - returns unwrapped string
  async generateSummary(content: string): Promise<string> {
    try {
      const response = await this.generateResponse({
        prompt: `Provide a concise summary of the following content:\n\n${content}`,
        maxTokens: 500,
        temperature: 0.5,
        systemPrompt: 'You are an expert at creating clear, concise summaries that capture the essential information.'
      });

      return response.content;
    } catch (error) {
      logger.error('BaseAIProvider', 'Summary generation failed', error);
      throw new Error('Failed to generate summary');
    }
  }

  protected validateApiKey(): void {
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new Error(`API key is required for ${this.config.provider}`);
    }
  }

  protected handleError(error: any, operation: string): never {
    logger.error(`${this.constructor.name}`, `${operation} failed`, error);
    
    if (error.message?.includes('API key')) {
      throw new Error('Invalid or missing API key');
    }
    if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded');
    }
    if (error.message?.includes('rate limit')) {
      throw new Error('Rate limit exceeded - please try again later');
    }
    
    throw new Error(error.message || `${operation} failed`);
  }
}
