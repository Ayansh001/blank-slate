
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Pause, Play } from 'lucide-react';
import { useQuizTimer } from '@/hooks/useQuizTimer';

interface QuizTimerProps {
  startTime: Date | null;
  onTimerUpdate?: (elapsedSeconds: number) => void;
  showControls?: boolean;
  compact?: boolean;
}

export function QuizTimer({ 
  startTime, 
  onTimerUpdate, 
  showControls = false, 
  compact = false 
}: QuizTimerProps) {
  const {
    formattedTime,
    isRunning,
    isPaused,
    currentQuestionTime,
    pause,
    resume,
    formatTime
  } = useQuizTimer(startTime);

  React.useEffect(() => {
    if (onTimerUpdate && isRunning) {
      const elapsed = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
      onTimerUpdate(elapsed);
    }
  }, [formattedTime, onTimerUpdate, startTime, isRunning]);

  if (!startTime) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{formattedTime}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <div className="text-sm font-mono">
          <span className="font-semibold">{formattedTime}</span>
          {isPaused && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Paused
            </Badge>
          )}
        </div>
      </div>

      {currentQuestionTime > 0 && (
        <div className="text-xs text-muted-foreground">
          Question: {formatTime(currentQuestionTime)}
        </div>
      )}

      {showControls && (
        <div className="flex items-center gap-1">
          {isPaused ? (
            <Button
              variant="outline"
              size="sm"
              onClick={resume}
              className="h-7 px-2"
            >
              <Play className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={pause}
              className="h-7 px-2"
            >
              <Pause className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
