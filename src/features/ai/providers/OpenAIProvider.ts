

import { BaseAIProvider } from './BaseAIProvider';
import { AIResponse, GenerateOptions } from '../types/providers';
import { logger } from '../utils/DebugLogger';

export class OpenAIProvider extends BaseAIProvider {
  async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    this.validateApiKey();
    
    try {
      const messages = [];
      
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      messages.push({ role: 'user', content: options.prompt });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return {
        content,
        usage: {
          tokens: data.usage?.total_tokens || 0,
          cost: this.calculateCost(data.usage?.total_tokens || 0)
        }
      };

    } catch (error) {
      this.handleError(error, 'Text generation');
    }
  }

  // Updated to match interface signature (content: string)
  async generateQuiz(content: string): Promise<AIResponse> {
    const prompt = `Create a multiple choice quiz based on the following content. Return only valid JSON with this structure: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]}. Content: ${content}`;
    
    return this.generateResponse({
      prompt,
      systemPrompt: 'You are an expert educator who creates high-quality, educational quizzes. Return only valid JSON format as specified.',
      maxTokens: 3000,
      temperature: 0.7
    });
  }

  async enhanceText(content: string): Promise<string> {
    const response = await this.generateResponse({
      prompt: `Please enhance and improve the following text while maintaining its core meaning and structure. Focus on clarity, grammar, and readability:\n\n${content}`,
      maxTokens: 2000,
      temperature: 0.7,
      systemPrompt: 'You are an expert editor who improves text clarity, grammar, and structure while preserving the original meaning and style.'
    });
    
    return response.content;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.generateResponse({
        prompt: 'Hello',
        maxTokens: 10
      });
      return !!response.content;
    } catch {
      return false;
    }
  }

  getCapabilities(): string[] {
    return [
      'text_generation',
      'quiz_generation', 
      'note_enhancement',
      'chat_support',
      'content_analysis'
    ];
  }

  private calculateCost(tokens: number): number {
    // Rough cost calculation for OpenAI (varies by model)
    const costPer1000Tokens = 0.002; // $0.002 per 1K tokens for GPT-3.5
    return (tokens / 1000) * costPer1000Tokens;
  }
}

