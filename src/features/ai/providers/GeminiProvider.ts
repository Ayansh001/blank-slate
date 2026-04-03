

import { BaseAIProvider } from './BaseAIProvider';
import { AIResponse, GenerateOptions } from '../types/providers';

export class GeminiProvider extends BaseAIProvider {
  async generateResponse(options: GenerateOptions): Promise<AIResponse> {
    this.validateApiKey();
    
    try {
      const prompt = options.systemPrompt 
        ? `${options.systemPrompt}\n\nUser: ${options.prompt}`
        : options.prompt;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        throw new Error('No content received from Gemini');
      }

      return {
        content,
        usage: {
          tokens: data.usageMetadata?.totalTokenCount || 0
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

