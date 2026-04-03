import { supabase } from '@/integrations/supabase/client';

// Centralized chat utility functions
export const getChatEndpoint = () => {
  const projectRef = 'slizsctvvubqnqgsucsj';
  return `https://${projectRef}.supabase.co/functions/v1/ai-chat-sse`;
};

export const validateMessage = (message: string): string | null => {
  if (!message || typeof message !== 'string') {
    return 'Message is required';
  }
  
  if (message.trim().length === 0) {
    return 'Message cannot be empty';
  }
  
  if (message.length > 10000) {
    return 'Message is too long (max 10,000 characters)';
  }
  
  return null;
};

export const buildSystemPrompt = (
  basePrompt: string,
  fileContext?: Array<{ id: string; name: string; content?: string }>
): string => {
  let prompt = basePrompt;
  
  if (fileContext && fileContext.length > 0) {
    const contextSummary = fileContext
      .map(file => `File: "${file.name}" - ${file.content?.slice(0, 500)}...`)
      .join('\n\n');
      
    prompt += `\n\nYou have access to the following files:\n${contextSummary}`;
  }
  
  return prompt;
};

export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};