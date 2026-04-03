
import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProminentQuizTimerProps {
  elapsedSeconds: number;
  isPaused: boolean;
  formattedTime: string;
  className?: string;
}

export function ProminentQuizTimer({ 
  elapsedSeconds, 
  isPaused, 
  formattedTime, 
  className 
}: ProminentQuizTimerProps) {
  // Debug logging
  console.log('ProminentQuizTimer - Props:', { elapsedSeconds, isPaused, formattedTime });

  // Color coding based on elapsed time
  const getTimerColor = () => {
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 30) return 'text-green-600 dark:text-green-400';
    if (minutes < 45) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTimerBg = () => {
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 30) return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
    if (minutes < 45) return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
  };

  const shouldPulse = () => {
    const minutes = Math.floor(elapsedSeconds / 60);
    return minutes >= 45;
  };

  const minutes = Math.floor(elapsedSeconds / 60);

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-300",
      getTimerBg(),
      shouldPulse() && "animate-pulse",
      className
    )}>
      <div className="flex items-center gap-2">
        <Clock className={cn("h-6 w-6", getTimerColor())} />
        {elapsedSeconds >= 2700 && ( // 45 minutes
          <AlertTriangle className="h-5 w-5 text-red-500 animate-bounce" />
        )}
      </div>
      
      <div className="flex-1">
        <div className={cn("text-3xl font-bold font-mono", getTimerColor())}>
          {formattedTime || "0:00"}
        </div>
        <div className="text-sm text-muted-foreground">
          Quiz Duration ({elapsedSeconds}s total)
        </div>
      </div>

      {isPaused && (
        <Badge variant="secondary" className="text-sm">
          Paused
        </Badge>
      )}
      
      {elapsedSeconds >= 1800 && ( // 30 minutes
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {elapsedSeconds >= 2700 ? 'Consider wrapping up' : 'Good pace'}
          </div>
        </div>
      )}
    </div>
  );
}
