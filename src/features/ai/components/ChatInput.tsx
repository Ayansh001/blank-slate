import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateMessage } from '../utils/chatUtils';
import { toast } from 'sonner';

interface FileContext {
  id: string;
  name: string;
  content?: string;
}

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  fileContext?: FileContext[];
  onRemoveFile?: (fileId: string) => void;
  maxLength?: number;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  fileContext = [],
  onRemoveFile,
  maxLength = 10000
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    const validationError = validateMessage(trimmedMessage);
    
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    onSendMessage(trimmedMessage);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className="space-y-3">
      {/* File Context Display */}
      {fileContext.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fileContext.map((file) => (
            <Badge 
              key={file.id} 
              variant="secondary" 
              className="flex items-center gap-1 max-w-xs"
            >
              <FileText className="h-3 w-3" />
              <span className="truncate">{file.name}</span>
              {onRemoveFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onRemoveFile(file.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none",
              isOverLimit && "border-destructive focus-visible:ring-destructive"
            )}
            rows={1}
          />
          
          {/* Character Count */}
          {isNearLimit && (
            <div className={cn(
              "absolute bottom-2 right-2 text-xs",
              isOverLimit ? "text-destructive" : "text-muted-foreground"
            )}>
              {characterCount}/{maxLength}
            </div>
          )}
        </div>
        
        <Button 
          type="submit"
          disabled={disabled || !message.trim() || isOverLimit}
          className="shrink-0"
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}