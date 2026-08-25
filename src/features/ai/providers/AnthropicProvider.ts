

import { BaseAIProvider } from './BaseAIProvider';
import { AIResponse, GenerateOptions } from '../types/providers';

export class AnthropicProvider extends BaseAIProvider {
  async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    this.validateApiKey();
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          system: options.systemPrompt || 'You are a helpful AI assistant.',
          messages: [
            { role: 'user', content: options.prompt }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      
      if (!content) {
        throw new Error('No content received from Anthropic');
      }

      return {
        content,
        usage: {
          tokens: data.usage?.input_tokens + data.usage?.output_tokens || 0
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
}

