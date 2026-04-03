
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Target, 
  Clock, 
  Brain, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  RotateCcw,
  Plus,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';
import { AdvancedQuizSession } from '../types/advancedQuiz';
import { AnswerNormalizer } from '../utils/answerNormalization';

interface AdvancedQuizResultsProps {
  session: AdvancedQuizSession;
  onReset: () => void;
  onNewQuiz: () => void;
}

export function AdvancedQuizResults({ session, onReset, onNewQuiz }: AdvancedQuizResultsProps) {
  const scorePercentage = session.score;
  const correctAnswers = Math.round((scorePercentage / 100) * session.questions.length);
  const totalQuestions = session.questions.length;
  const visualQuestionCount = session.questions.filter(q => q.visualContent).length;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-bold">Quiz Completed!</h2>
          <p className="text-muted-foreground">Here's how you performed on your advanced quiz</p>
          {visualQuestionCount > 0 && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <ImageIcon className="h-4 w-4" />
              Including {visualQuestionCount} questions with visual content
            </p>
          )}
        </div>
      </div>

      {/* Score Overview */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Target className="h-5 w-5" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className={`text-6xl font-bold ${getScoreColor(scorePercentage)}`}>
              {scorePercentage.toFixed(1)}%
            </div>
            <div className="text-lg font-medium text-muted-foreground">
              {getPerformanceLevel(scorePercentage)}
            </div>
            <Progress value={scorePercentage} className="w-full h-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{session.time_spent_minutes}</div>
              <div className="text-sm text-muted-foreground">Minutes</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold capitalize">{session.config.difficulty}</div>
              <div className="text-sm text-muted-foreground">Difficulty</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Category Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(session.detailedResults.categoryScores).map(([category, score]) => (
            <div key={category} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{category}</span>
                <span className={`font-bold ${getScoreColor(score)}`}>
                  {score.toFixed(1)}%
                </span>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Question Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Question Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Question Types Used</h4>
              <div className="flex flex-wrap gap-2">
                {session.config.questionTypes.map(type => {
                  const hasVisual = ['diagram_labeling', 'chart_analysis', 'visual_interpretation'].includes(type);
                  return (
                    <Badge key={type} variant="secondary" className="flex items-center gap-1">
                      {hasVisual && <ImageIcon className="h-3 w-3" />}
                      {type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Categories Covered</h4>
              <div className="flex flex-wrap gap-2">
                {session.config.categories.map(category => (
                  <Badge key={category} variant="outline">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">Average Time</div>
              <div className="text-muted-foreground">
                {Math.round(session.time_spent_minutes / totalQuestions)} min/question
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Depth Level</div>
              <div className="text-muted-foreground capitalize">
                {session.config.questionDepth}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Content Type</div>
              <div className="text-muted-foreground capitalize">
                {session.config.contentType}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Question Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Question Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.questions.map((question, index) => {
            const userAnswer = session.answers[index];
            const isCorrect = AnswerNormalizer.compareAnswers(userAnswer, question.correctAnswer, question.type);
            
            return (
              <div key={question.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Q{index + 1}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {question.type.replace('_', ' ')}
                      </Badge>
                      {question.visualContent && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Visual
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium mb-2">{question.question}</p>
                    
                    {/* Display visual content in results */}
                    {question.visualContent && question.visualContent.data && (
                      <div className="mb-3">
                        <img
                          src={question.visualContent.data}
                          alt={question.visualContent.description || 'Question visual content'}
                          className="max-w-xs max-h-32 object-contain border rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Your answer: <span className="font-medium">
                          {AnswerNormalizer.formatAnswerForDisplay(userAnswer, question)}
                        </span>
                      </div>
                      <div>
                        Correct answer: <span className="font-medium">
                          {AnswerNormalizer.formatAnswerForDisplay(question.correctAnswer, question)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {question.explanation && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm">{question.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <Button onClick={onNewQuiz} size="lg" className="min-w-[200px]">
          <Plus className="h-4 w-4 mr-2" />
          Create New Advanced Quiz
        </Button>
        <Button variant="outline" onClick={onReset} size="lg" className="min-w-[200px]">
          <RotateCcw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
