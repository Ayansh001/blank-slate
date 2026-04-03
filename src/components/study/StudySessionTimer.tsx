import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Timer,
  Coffee,
  Book,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface StudySessionTimerProps {
  taskTitle?: string;
  estimatedTime?: string;
  onSessionComplete?: () => void;
}

export function StudySessionTimer({ 
  taskTitle = "Study Session",
  estimatedTime = "25 minutes",
  onSessionComplete 
}: StudySessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Session completed
      setIsRunning(false);
      if (isBreak) {
        // Break completed, start next study session
        setIsBreak(false);
        setTimeLeft(25 * 60);
        setInitialTime(25 * 60);
        toast.success("Break complete! Ready for next study session?");
      } else {
        // Study session completed
        setSessionsCompleted(prev => prev + 1);
        setIsBreak(true);
        setTimeLeft(5 * 60); // 5 minute break
        setInitialTime(5 * 60);
        toast.success("Study session complete! Time for a break.");
        onSessionComplete?.();
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isBreak, onSessionComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
    setInitialTime(isBreak ? 5 * 60 : 25 * 60);
  };

  const handleSkipBreak = () => {
    setIsBreak(false);
    setTimeLeft(25 * 60);
    setInitialTime(25 * 60);
    setIsRunning(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {isBreak ? (
            <>
              <Coffee className="h-5 w-5 text-orange-500" />
              Break Time
            </>
          ) : (
            <>
              <Book className="h-5 w-5 text-blue-500" />
              Study Session
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isBreak ? "Take a short break to recharge" : taskTitle}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-6xl font-mono font-bold text-primary mb-2">
            {formatTime(timeLeft)}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Session Info */}
        <div className="flex justify-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {isBreak ? "5 min break" : estimatedTime}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {sessionsCompleted} sessions
          </Badge>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="flex items-center gap-2">
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          
          <Button onClick={handleReset} variant="outline" className="flex items-center gap-2">
            <Square className="h-4 w-4" />
            Reset
          </Button>

          {isBreak && (
            <Button onClick={handleSkipBreak} variant="secondary" className="flex items-center gap-2">
              Skip Break
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="text-center text-sm text-muted-foreground">
          {isBreak ? (
            "Stretch, hydrate, or take a short walk"
          ) : (
            "Focus on your task. Avoid distractions."
          )}
        </div>
      </CardContent>
    </Card>
  );
}