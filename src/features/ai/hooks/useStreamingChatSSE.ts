import { useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AIChatMessage } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StreamingChatSSEOptions {
  sessionId?: string;
  fileContext?: Array<{ id: string; name: string; content?: string }>;
}

export function useStreamingChatSSE({ sessionId, fileContext }: StreamingChatSSEOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async (currentSessionId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as AIChatMessage[] || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat messages');
    }
  };

  const sendMessage = useCallback(async (message: string) => {
    if (!user || !sessionId) {
      toast.error('No active session');
      return;
    }

    setIsStreaming(true);
    setStreamingMessage('');
    setError(null);

    // Add user message immediately to UI
    const userMessage: AIChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Make SSE request
      const response = await fetch(`https://slizsctvvubqnqgsucsj.supabase.co/functions/v1/ai-chat-sse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          fileReferences: fileContext || []
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SSE request failed:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again');
        } else if (response.status === 400) {
          const errorData = JSON.parse(errorText);
          if (errorData.requiresConfig) {
            throw new Error(errorData.details || 'AI service configuration required');
          }
          throw new Error(errorData.details || 'Invalid request');
        } else if (response.status === 500) {
          throw new Error('AI service error - please check your configuration and try again');
        } else {
          throw new Error(`Connection error (${response.status}): ${errorText}`);
        }
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'chunk':
                  setStreamingMessage(prev => prev + data.content);
                  break;
                  
                case 'complete':
                  setIsStreaming(false);
                  setStreamingMessage('');
                  // Reload messages to get the saved assistant response
                  await loadMessages(sessionId);
                  break;
                  
                case 'error':
                  throw new Error(data.message || 'Stream error');
                  
                default:
                  console.log('Unknown event type:', data.type);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('SSE error:', error);
      setError((error as Error).message);
      setIsStreaming(false);
      setStreamingMessage('');
      toast.error('Failed to send message: ' + (error as Error).message);
    }
  }, [user, sessionId, fileContext]);

  return {
    messages,
    isStreaming,
    streamingMessage,
    error,
    sendMessage,
    loadMessages
  };
}