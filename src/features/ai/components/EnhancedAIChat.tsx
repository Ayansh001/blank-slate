
// Enhanced AI Chat Interface - Optimized with modern UX
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  FileText, 
  Loader2,
  Sparkles,
  WifiOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIConfig } from '../hooks/useAIConfig';
import { useEnhancedChat } from '../hooks/useEnhancedChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Button } from '@/components/ui/button';
import { AIChatSession, AIServiceProvider } from '../types';
import { SessionCleanupService } from '../services/SessionCleanupService';

interface EnhancedAIChatProps {
  sessionId?: string;
  fileContext?: {
    id: string;
    name: string;
    content?: string;
  }[];
  onUserInteraction?: () => void;
  createSessionWhenNeeded?: () => Promise<AIChatSession | null>;
}

export function EnhancedAIChat({ 
  sessionId: propSessionId, 
  fileContext,
  onUserInteraction,
  createSessionWhenNeeded
}: EnhancedAIChatProps) {
  const { user } = useAuth();
  const { activeConfig } = useAIConfig();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [actualSessionId, setActualSessionId] = useState<string | undefined>(propSessionId);
  const pendingMessageRef = useRef<string | null>(null);
  
  // Use enhanced chat hook
  const { 
    messages, 
    isStreaming, 
    streamingMessage, 
    error,
    isLoading,
    sendMessage,
    loadMessages,
    clearError
  } = useEnhancedChat({ 
    sessionId: actualSessionId, 
    fileContext,
    systemPrompt: "You are an AI study assistant. Help users understand and analyze their documents, answer questions, and provide educational support."
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Additional scroll trigger for streaming updates
  useEffect(() => {
    if (isStreaming && streamingMessage) {
      scrollToBottom();
    }
  }, [isStreaming, streamingMessage]);

  // Update session ID when prop changes
  useEffect(() => {
    setActualSessionId(propSessionId);
  }, [propSessionId]);

  // Send pending message when session ID becomes available
  useEffect(() => {
    if (actualSessionId && pendingMessageRef.current) {
      const messageToSend = pendingMessageRef.current;
      pendingMessageRef.current = null;
      sendMessage(messageToSend);
    }
  }, [actualSessionId, sendMessage]);

  // Load messages from DB when session becomes available to rehydrate context
  useEffect(() => {
    if (!actualSessionId) return;
    loadMessages(true);
  }, [actualSessionId, loadMessages]);

  const scrollToBottom = () => {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    });
  };

  const handleRetry = () => {
    clearError();
    if (actualSessionId) {
      loadMessages(true);
    }
  };

  const handleSendMessage = async (message: string) => {
    // Track user interaction
    if (onUserInteraction) {
      onUserInteraction();
    }

    // If we have a session, mark it as used and send message
    if (actualSessionId && user) {
      await SessionCleanupService.markSessionAsUsed(actualSessionId, user.id);
      await sendMessage(message);
      return;
    }

    // If no session exists, create one and queue the message
    if (!actualSessionId && createSessionWhenNeeded) {
      pendingMessageRef.current = message;
      const newSession = await createSessionWhenNeeded();
      if (newSession) {
        setActualSessionId(newSession.id);
        // Mark session as used when first message is sent
        if (user) {
          await SessionCleanupService.markSessionAsUsed(newSession.id, user.id);
        }
        // The useEffect will handle sending the pending message
      }
    }
  };

  if (!activeConfig) {
    return (
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Please configure an AI service first to use the chat feature.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Chat
            </CardTitle>
            {fileContext && fileContext.length > 0 && (
              <CardDescription className="flex items-center gap-2 mt-1">
                <FileText className="h-4 w-4" />
                {fileContext.length} file(s) in context
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
        {/* Status Indicators */}
            {error && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Error
              </Badge>
            )}
            {isLoading && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading
              </Badge>
            )}
            {isStreaming && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI Thinking
              </Badge>
            )}
            {!actualSessionId && (
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Ready to Chat
              </Badge>
            )}
            {activeConfig && (
              <Badge variant="outline" className="text-xs">
                {activeConfig.service_name} • {activeConfig.model_name}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && !actualSessionId && (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
                <p className="text-muted-foreground">
                  Your first message will create a new chat session automatically.
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                provider={activeConfig?.service_name as AIServiceProvider}
                showTimestamp={true}
              />
            ))}
            
            {isStreaming && messages.length > 0 && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  session_id: actualSessionId || '',
                  user_id: user?.id || '',
                  role: 'assistant',
                  content: '',
                  created_at: new Date().toISOString()
                }}
                provider={activeConfig?.service_name as AIServiceProvider}
                isStreaming={true}
                streamingContent={streamingMessage}
                showTimestamp={false}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error Display */}
        {error && (
          <div className="border-t p-3 shrink-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span><strong>Error:</strong> {error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRetry}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4 shrink-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!!error || isStreaming}
            placeholder={actualSessionId ? "Ask me anything about your documents..." : "Start a conversation..."}
            fileContext={fileContext}
          />
          
          {!actualSessionId && (
            <p className="text-sm text-muted-foreground mt-2">
              Your first message will create a new chat session
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
