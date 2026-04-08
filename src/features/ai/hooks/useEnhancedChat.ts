import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AIChatMessage } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedChatOptions {
  sessionId?: string;
  fileContext?: Array<{ id: string; name: string; content?: string }>;
  systemPrompt?: string;
}

export function useEnhancedChat({ sessionId, fileContext, systemPrompt }: EnhancedChatOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastContextSummary, setLastContextSummary] = useState<string>('');
  const retryCount = useRef(0);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper to extract context tag from assistant response
  const extractContextFromText = (text: string): string => {
    const match = text.match(/\[CONTEXT:([^\]]+)\]/i);
    return match ? match[1].trim() : '';
  };

  // Helper to strip context tag for clean UI display
  const stripContextTag = (text: string): string =>
    text.replace(/\[CONTEXT:[^\]]*\]/gi, '').trim();

  const loadMessages = useCallback(async (force = false) => {
    if (!user || !sessionId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const dbMessages = (data as AIChatMessage[]) || [];

      // Process messages: strip context tags and recover last context
      let latestContextFromDB = '';
      const processed = dbMessages.map((m) => {
        if (m.role === 'assistant' && typeof m.content === 'string') {
          const ctx = extractContextFromText(m.content);
          if (ctx) latestContextFromDB = ctx;
          return { ...m, content: stripContextTag(m.content) };
        }
        return m;
      });

      // Restore last context for next turn
      if (latestContextFromDB) {
        setLastContextSummary(latestContextFromDB);
        console.log('Rehydrated context from DB:', latestContextFromDB);
      }

      setMessages(processed);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!force) {
        toast.error('Failed to load chat messages');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionId]);

  const loadMessagesWithRetry = useCallback(async (optimisticMessages: AIChatMessage[]) => {
    if (!user || !sessionId) return;

    const maxRetries = 3;
    const retryDelays = [400, 800, 1200]; // ms

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const dbMessages = (data as AIChatMessage[]) || [];

      // Process messages: strip context tags and recover last context
      let latestContextFromDB = '';
      const processed = dbMessages.map((m) => {
        if (m.role === 'assistant' && typeof m.content === 'string') {
          const ctx = extractContextFromText(m.content);
          if (ctx) latestContextFromDB = ctx;
          return { ...m, content: stripContextTag(m.content) };
        }
        return m;
      });
      
      // Check if we have the expected number of messages (user + assistant)
      if (dbMessages.length >= optimisticMessages.length) {
        // Restore last context for next turn
        if (latestContextFromDB) {
          setLastContextSummary(latestContextFromDB);
          console.log('Rehydrated context from DB (retry):', latestContextFromDB);
        }
        setMessages(processed);
        return;
      }
        
        // If this is the last attempt, keep optimistic messages
        if (attempt === maxRetries - 1) {
          console.warn('DB messages not yet visible after retries, keeping optimistic state');
          return;
        }
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      } catch (error) {
        console.error(`Error loading messages (attempt ${attempt + 1}):`, error);
        if (attempt === maxRetries - 1) {
          // Keep optimistic messages on final failure
          return;
        }
      }
    }
  }, [user, sessionId]);

  // Reset context summary when session changes
  useEffect(() => {
    setLastContextSummary('');
  }, [sessionId]);

  const sendMessage = useCallback(async (message: string) => {
    if (!user || !sessionId) {
      toast.error('No active session');
      return;
    }

    setIsStreaming(true);
    setStreamingMessage('');
    setError(null);
    retryCount.current = 0;

    // Add user message immediately to UI
    const userMessage: AIChatMessage = {
      id: `temp-user-${Date.now()}`,
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString()
    };
    
    const optimisticMessages = [...messages, userMessage];
    setMessages(optimisticMessages);

    try {
      // Get active AI service configuration
      const { data: configData } = await supabase
        .from('ai_service_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!configData?.api_key) {
        throw new Error('AI service not configured. Please add your API key in AI settings.');
      }

      console.log(`Using ${configData.service_name} for chat request`);

      // Use Supabase client invoke method for edge functions with auth header
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Determine which edge function to use based on service
      let edgeFunction = 'universal-ai-handler';
      let requestBody: any = {
        message,
        apiKey: configData.api_key,
        sessionId,
        context: fileContext?.map(file => ({
          id: file.id,
          name: file.name,
          content: file.content
        })) || []
      };

      if (configData.service_name === 'gemini') {
        edgeFunction = 'ai-gemini-chat';
        requestBody = {
          message,
          lastContext: lastContextSummary,
          apiKey: configData.api_key,
          model: configData.model_name || 'gemini-2.0-flash',
          sessionId,
          context: fileContext?.map(file => ({
            id: file.id,
            name: file.name,
            content: file.content
          })) || []
        };
      } else if (configData.service_name === 'openai') {
        edgeFunction = 'openai-simple-chat';
        requestBody = {
          message,
          lastContext: lastContextSummary,
          apiKey: configData.api_key,
          model: configData.model_name || 'gpt-4o-mini',
          sessionId,
          context: fileContext?.map(file => ({
            id: file.id,
            name: file.name,
            content: file.content
          })) || []
        };
      }

      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: requestBody,
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (error) {
        console.error('AI handler error:', error);
        throw new Error(error.message || 'AI service error - please check your configuration and try again');
      }

      // Handle the response
      if (data) {
        console.log('AI handler response received');
        
        // If it's a simple response (not streaming), handle it directly
        if (data.response) {
          const fullResponse = data.response;
          
          // Extract context using robust regex
          const contextMatch = fullResponse.match(/\[CONTEXT:([^\]]+)\]/i);
          const extractedContext = contextMatch ? contextMatch[1].trim() : '';
          
          // Strip context tags from visible content
          const visibleContent = fullResponse.replace(/\[CONTEXT:[^\]]*\]/gi, '').trim();
          
          // Fallback to template if AI didn't generate context
          let finalContext = extractedContext;
          if (!finalContext) {
            console.warn('AI did not generate context, using template fallback');
            const userMsg = message.slice(0, 60).trim();
            const aiMsg = visibleContent.slice(0, 80).trim();
            finalContext = `User: "${userMsg}${message.length > 60 ? '...' : ''}" | AI: "${aiMsg}${visibleContent.length > 80 ? '...' : ''}"`;
          }
          
          // Save context for next turn
          setLastContextSummary(finalContext);
          console.log('Extracted context:', finalContext);
          
          // Create assistant message with visible content only
          const assistantMessage: AIChatMessage = {
            id: `temp-assistant-${Date.now()}`,
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: visibleContent,
            created_at: new Date().toISOString()
          };
          
          const finalOptimisticMessages = [...optimisticMessages, assistantMessage];
          setMessages(finalOptimisticMessages);
          setStreamingMessage('');
          
          // Try to load from DB with retries, but keep optimistic state if DB lags
          setTimeout(async () => {
            await loadMessagesWithRetry(finalOptimisticMessages);
            setIsStreaming(false);
          }, 200);
          return;
        }
        
        // If it's an error response
        if (data.error) {
          throw new Error(data.error);
        }
      }

      // If we get here, it means the response format is unexpected
      console.log('Unexpected response format:', data);
      setIsStreaming(false);
      setStreamingMessage('');
      await loadMessages(true);
    } catch (error) {
      console.error('Enhanced chat error:', error);
      setError((error as Error).message);
      setIsStreaming(false);
      setStreamingMessage('');
      toast.error('Failed to send message: ' + (error as Error).message);
    }
  }, [user, sessionId, fileContext, messages, loadMessages, loadMessagesWithRetry, lastContextSummary]);

  return {
    messages,
    isStreaming,
    streamingMessage,
    error,
    isLoading,
    sendMessage,
    loadMessages,
    clearError
  };
}
