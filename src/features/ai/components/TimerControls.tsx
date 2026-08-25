
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  elapsedTime: string;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  showControls?: boolean;
  compact?: boolean;
}

export function TimerControls({
  isRunning,
  isPaused,
  elapsedTime,
  onPause,
  onResume,
  onReset,
  showControls = true,
  compact = false
}: TimerControlsProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono">{elapsedTime}</span>
        {isPaused && <Badge variant="secondary" className="text-xs">Paused</Badge>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <div className="font-mono text-lg font-semibold">{elapsedTime}</div>
        {isPaused && <Badge variant="secondary">Paused</Badge>}
      </div>
      
      {showControls && (
        <div className="flex items-center gap-1">
          {isPaused ? (
            <Button variant="outline" size="sm" onClick={onResume}>
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
