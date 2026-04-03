
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Target, TrendingUp, Award } from 'lucide-react';

interface QuizAnalyticsProps {
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in seconds
  averageTimePerQuestion: number;
  categoryScores: Record<string, number>;
  difficultyDistribution: Record<string, number>;
}

export function QuizAnalytics({
  totalQuestions,
  correctAnswers,
  timeSpent,
  averageTimePerQuestion,
  categoryScores,
  difficultyDistribution
}: QuizAnalyticsProps) {
  const accuracy = (correctAnswers / totalQuestions) * 100;
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'bg-green-500' };
    if (score >= 80) return { level: 'Good', color: 'bg-blue-500' };
    if (score >= 70) return { level: 'Fair', color: 'bg-yellow-500' };
    return { level: 'Needs Improvement', color: 'bg-red-500' };
  };

  const performance = getPerformanceLevel(accuracy);

  return (
    <div className="space-y-4">
      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{accuracy.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <Badge variant="secondary" className={`mt-1 ${performance.color} text-white`}>
                {performance.level}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{correctAnswers}/{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTime(timeSpent)}</div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTime(averageTimePerQuestion)}</div>
              <div className="text-sm text-muted-foreground">Avg/Question</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {Object.keys(categoryScores).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Category Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(categoryScores).map(([category, score]) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
                  <span className="text-sm text-muted-foreground">{score.toFixed(1)}%</span>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Time Efficiency</div>
              <div className="text-lg font-semibold">
                {averageTimePerQuestion < 60 ? 'Fast' : 
                 averageTimePerQuestion < 120 ? 'Steady' : 'Thoughtful'}
              </div>
              <div className="text-xs text-muted-foreground">
                {averageTimePerQuestion < 60 && 'Quick responses - good recall'}
                {averageTimePerQuestion >= 60 && averageTimePerQuestion < 120 && 'Balanced pace'}
                {averageTimePerQuestion >= 120 && 'Careful consideration of answers'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Recommended Focus</div>
              <div className="text-lg font-semibold">
                {accuracy < 70 ? 'Content Review' : 
                 averageTimePerQuestion > 180 ? 'Speed Practice' : 'Keep Practicing'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Improvement Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {accuracy < 70 && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border-l-4 border-yellow-400">
                Consider reviewing the material more thoroughly before retaking the quiz.
              </div>
            )}
            {averageTimePerQuestion > 180 && (
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border-l-4 border-blue-400">
                Try to trust your first instinct more often to improve response time.
              </div>
            )}
            {accuracy >= 90 && (
              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border-l-4 border-green-400">
                Excellent performance! Consider trying more challenging questions.
              </div>
            )}
            {Object.values(categoryScores).some(score => score < 60) && (
              <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded border-l-4 border-red-400">
                Focus on categories where you scored below 60% for targeted improvement.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
