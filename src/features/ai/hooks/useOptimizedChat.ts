import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AIChatMessage } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getChatEndpoint, buildSystemPrompt, formatErrorMessage, debounce } from '../utils/chatUtils';

interface OptimizedChatOptions {
  sessionId?: string;
  fileContext?: Array<{ id: string; name: string; content?: string }>;
  systemPrompt?: string;
  enableCaching?: boolean;
}

export function useOptimizedChat({ 
  sessionId, 
  fileContext, 
  systemPrompt = "You are a helpful AI assistant.",
  enableCaching = true 
}: OptimizedChatOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Cache for loaded messages
  const messageCache = useRef<Map<string, AIChatMessage[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced error clearing
  const clearErrorDebounced = useCallback(
    debounce(() => setError(null), 5000),
    []
  );

  const loadMessages = useCallback(async (currentSessionId: string, forceRefresh = false) => {
    if (!user) return;
    
    // Check cache first
    if (enableCaching && !forceRefresh && messageCache.current.has(currentSessionId)) {
      const cachedMessages = messageCache.current.get(currentSessionId)!;
      setMessages(cachedMessages);
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', currentSessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100); // Pagination - load recent messages

      if (error) throw error;
      
      const loadedMessages = (data as AIChatMessage[]) || [];
      setMessages(loadedMessages);
      
      // Cache the messages
      if (enableCaching) {
        messageCache.current.set(currentSessionId, loadedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      const errorMsg = formatErrorMessage(error);
      setError(errorMsg);
      toast.error('Failed to load chat messages: ' + errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, enableCaching]);

  const sendMessage = useCallback(async (message: string) => {
    if (!user || !sessionId) {
      const errorMsg = 'No active session';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    setIsStreaming(true);
    setStreamingMessage('');
    setError(null);

    // Add user message optimistically
    const userMessage: AIChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Update cache immediately
    if (enableCaching && messageCache.current.has(sessionId)) {
      const cached = messageCache.current.get(sessionId)!;
      messageCache.current.set(sessionId, [...cached, userMessage]);
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      const effectiveSystemPrompt = buildSystemPrompt(systemPrompt, fileContext);

      const response = await fetch(getChatEndpoint(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          fileReferences: fileContext || [],
          systemPrompt: effectiveSystemPrompt
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat request failed:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication failed - please log in again');
        } else if (response.status === 400) {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.details || 'Invalid request');
        } else if (response.status === 500) {
          throw new Error('AI service error - please check your configuration');
        } else {
          throw new Error(`Connection error (${response.status})`);
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
                  // Invalidate cache and reload messages to get the saved assistant response
                  if (enableCaching) {
                    messageCache.current.delete(sessionId);
                  }
                  // Add a small delay to ensure database write completes
                  setTimeout(() => {
                    loadMessages(sessionId, true);
                  }, 500);
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
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error('Chat error:', error);
      const errorMsg = formatErrorMessage(error);
      setError(errorMsg);
      setIsStreaming(false);
      setStreamingMessage('');
      toast.error('Failed to send message: ' + errorMsg);
      
      // Clear error after delay
      clearErrorDebounced();
    } finally {
      abortControllerRef.current = null;
    }
  }, [user, sessionId, fileContext, systemPrompt, enableCaching, loadMessages, clearErrorDebounced]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      loadMessages(sessionId);
    }
  }, [sessionId, loadMessages]);

  return {
    messages,
    isStreaming,
    streamingMessage,
    error,
    isLoading,
    sendMessage,
    loadMessages: (forceRefresh?: boolean) => sessionId ? loadMessages(sessionId, forceRefresh) : Promise.resolve(),
    clearError: () => setError(null)
  };
}