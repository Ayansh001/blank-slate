
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, Target, AlertTriangle } from 'lucide-react';
import { QuizDataNormalizer, NormalizedQuizData } from '../utils/quizDataNormalizer';
import { QuizErrorBoundary } from './QuizErrorBoundary';

interface QuizReviewDisplayProps {
  questions: any;
  userAnswers: any;
  score: number;
  timeSpent: number;
}

function QuizReviewContent({ questions, userAnswers, score, timeSpent }: QuizReviewDisplayProps) {
  // Normalize the quiz data using our utility
  const normalizedData: NormalizedQuizData | null = QuizDataNormalizer.normalizeQuizData({
    questions,
    answers: userAnswers,
    score,
    time_spent_minutes: timeSpent
  });

  if (!normalizedData) {
    return (
      <div className="text-center py-8 space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="text-lg font-medium mb-2">Quiz Data Unavailable</h3>
          <p className="text-muted-foreground">
            Unable to load quiz review data. The quiz session may be corrupted or in an unsupported format.
          </p>
        </div>
      </div>
    );
  }

  const { questions: normalizedQuestions, userAnswers: normalizedUserAnswers } = normalizedData;

  return (
    <div className="space-y-4">
      {/* Performance Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Score: {score}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Time: {timeSpent} min</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{normalizedQuestions.length} Questions</Badge>
        </div>
      </div>

      <Separator />

      {/* Questions Review */}
      <ScrollArea className="max-h-96">
        <div className="space-y-6">
          {normalizedQuestions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No questions available for review
            </div>
          ) : (
            normalizedQuestions.map((question, index) => {
              const userAnswer = normalizedUserAnswers[index] || 'Not answered';
              const correctAnswer = question.correct_answer;
              const isCorrect = QuizDataNormalizer.isAnswerCorrect(userAnswer, correctAnswer);
              
              return (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-2">
                        Q{index + 1}: {question.question}
                      </h4>

                      {question.options && question.options.length > 0 && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Options: {question.options.join(', ')}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={isCorrect ? 'default' : 'destructive'} className="text-xs">
                            Your Answer: {userAnswer}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Correct: {correctAnswer}
                          </Badge>
                        </div>

                        {question.explanation && (
                          <div className="p-2 bg-muted/30 rounded text-xs">
                            <span className="font-medium">Explanation: </span>
                            {question.explanation}
                          </div>
                        )}

                        {question.category && (
                          <Badge variant="outline" className="text-xs">
                            {question.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function QuizReviewDisplay(props: QuizReviewDisplayProps) {
  return (
    <QuizErrorBoundary>
      <QuizReviewContent {...props} />
    </QuizErrorBoundary>
  );
}
