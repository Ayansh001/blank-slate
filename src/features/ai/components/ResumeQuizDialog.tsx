
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, CheckCircle2 } from 'lucide-react';
import { QuizAutoSaveData } from '@/hooks/useQuizAutoSave';

interface ResumeQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedData: QuizAutoSaveData | null;
  onResume: (data: QuizAutoSaveData) => void;
  onStartFresh: () => void;
}

export function ResumeQuizDialog({ 
  open, 
  onOpenChange, 
  savedData, 
  onResume, 
  onStartFresh 
}: ResumeQuizDialogProps) {
  if (!savedData) return null;

  const completedQuestions = savedData.answers.filter(answer => answer !== null).length;
  const totalQuestions = savedData.questions.length;
  const progressPercent = Math.round((completedQuestions / totalQuestions) * 100);
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSaveTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const handleResume = () => {
    onResume(savedData);
    onOpenChange(false);
  };

  const handleStartFresh = () => {
    onStartFresh();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Resume Previous Quiz?
          </DialogTitle>
          <DialogDescription>
            We found a quiz in progress. You can resume where you left off or start a new quiz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Overview */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <Badge variant="secondary">
                {progressPercent}% Complete
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {completedQuestions} of {totalQuestions} answered
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(savedData.elapsedSeconds)} elapsed
              </div>
            </div>
          </div>

          {/* Quiz Details */}
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Current Question:</span> {savedData.questionIndex + 1} of {totalQuestions}
            </div>
            <div>
              <span className="font-medium">Difficulty:</span>{' '}
              <Badge variant="outline" className="text-xs">
                {savedData.config.difficulty}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Last Saved:</span>{' '}
              <span className="text-muted-foreground">
                {formatSaveTime(savedData.lastSaved)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleStartFresh} className="w-full sm:w-auto">
            Start Fresh Quiz
          </Button>
          <Button onClick={handleResume} className="w-full sm:w-auto">
            Resume Quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
