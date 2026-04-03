
import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { AIChatMessage, AIServiceProvider } from '../types';
import { Bot, User, Copy, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAIConfig } from '../hooks/useAIConfig';

interface ChatMessageProps {
  message: AIChatMessage;
  isStreaming?: boolean;
  streamingContent?: string;
  showTimestamp?: boolean;
  provider?: AIServiceProvider;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

export function ChatMessage({ 
  message, 
  isStreaming, 
  streamingContent, 
  showTimestamp = true,
  provider,
  onEdit,
  onDelete 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const { activeConfig } = useAIConfig();
  const isUser = message.role === 'user';
  const content = isStreaming ? (streamingContent || '') : message.content;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  // Get the AI service provider for the logo - use prop first, then activeConfig, then fallback
  const getProviderForLogo = (): AIServiceProvider => {
    if (provider) return provider;
    if (activeConfig?.service_name) {
      return activeConfig.service_name as AIServiceProvider;
    }
    return 'openai'; // Default fallback
  };

  const providerForLogo = getProviderForLogo();

  return (
    <div className={cn(
      "flex gap-3 group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {providerForLogo ? (
              <AIProviderLogo 
                provider={providerForLogo} 
                size={20}
                className="flex items-center justify-center"
              />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "max-w-[80%] space-y-2 min-w-0",
        isUser && "flex flex-col items-end"
      )}>
        <div className={cn(
          "p-3 rounded-lg relative overflow-hidden",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-foreground"
        )}>
          {isUser ? (
            <div className="text-sm whitespace-pre-wrap break-words">{content}</div>
          ) : (
            <Markdown content={content} className="text-sm break-words" />
          )}
          
          {isStreaming && (
            <div className="mt-2 mb-1">
              <Badge variant="secondary" className="h-6 px-2 flex items-center gap-1 w-fit">
                <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                <span className="text-xs">AI typing...</span>
              </Badge>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {showTimestamp && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(message.created_at).toLocaleTimeString()}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          
          {onEdit && isUser && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(message.id)}
              className="h-6 px-2 text-xs"
            >
              Edit
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(message.id)}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
