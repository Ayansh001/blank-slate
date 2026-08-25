
import React from 'react';
import { Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SaveStatus } from '@/hooks/useQuizAutoSave';
import { cn } from '@/lib/utils';

interface QuizSaveStatusIndicatorProps {
  saveStatus: SaveStatus;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  className?: string;
}

export function QuizSaveStatusIndicator({ 
  saveStatus, 
  hasUnsavedChanges, 
  lastSaved,
  className 
}: QuizSaveStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Saving...',
          variant: 'secondary' as const,
          className: 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
        };
      case 'saved':
        return {
          icon: <Check className="h-3 w-3" />,
          text: 'Saved',
          variant: 'secondary' as const,
          className: 'border-green-300 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Save Failed',
          variant: 'destructive' as const,
          className: 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
        };
      default:
        return {
          icon: <Save className="h-3 w-3" />,
          text: hasUnsavedChanges ? 'Unsaved Changes' : 'Auto-Save Active',
          variant: 'outline' as const,
          className: hasUnsavedChanges 
            ? 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400'
            : 'border-gray-300 bg-gray-50 text-gray-600 dark:bg-gray-950/20 dark:text-gray-400'
        };
    }
  };

  const config = getStatusConfig();

  const formatLastSaved = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <Badge 
        variant={config.variant}
        className={cn("flex items-center gap-1 text-xs px-2 py-1", config.className)}
      >
        {config.icon}
        {config.text}
      </Badge>
      
      {lastSaved && saveStatus === 'idle' && (
        <span className="text-muted-foreground">
          Last saved {formatLastSaved(lastSaved)}
        </span>
      )}
    </div>
  );
}
