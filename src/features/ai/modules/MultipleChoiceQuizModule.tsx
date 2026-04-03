
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Trophy,
  RotateCcw,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIProvider } from '@/features/ai/hooks/useAIProvider';
import { AIProviderFactory } from '../providers/AIProviderFactory';
import { toast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizSession {
  questions: Question[];
  answers: (number | null)[];
  score: number | null;
  completed: boolean;
  startTime: Date;
  endTime?: Date;
}

interface MultipleChoiceQuizModuleProps {
  content: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  onClose?: () => void;
}

export function MultipleChoiceQuizModule({ 
  content, 
  questionCount = 5, 
  difficulty = 'medium', 
  onClose 
}: MultipleChoiceQuizModuleProps) {
  const { user } = useAuth();
  const { selectedProvider, getProviderConfig } = useAIProvider();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQuiz = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      if (!selectedProvider) {
        throw new Error('No AI provider selected');
      }

      const providerConfig = await getProviderConfig();
      if (!providerConfig) {
        throw new Error('No AI provider configuration available');
      }

      const provider = AIProviderFactory.createProvider(providerConfig);
      
      const prompt = `Generate ${questionCount} multiple choice questions based on this content with ${difficulty} difficulty level:

Content: ${content.slice(0, 3000)}

Return ONLY a JSON array of questions in this exact format:
[
  {
    "id": "unique_id",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this is correct"
  }
]

Make sure each question has exactly 4 options and the correctAnswer is the index (0-3) of the correct option.`;

      const response = await provider.generateResponse({ prompt });
      
      let questions: Question[];
      try {
        // Extract JSON from response
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }
        questions = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        throw new Error('Failed to parse quiz questions from AI response');
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid quiz format received');
      }

      // Validate questions
      const validQuestions = questions.filter(q => 
        q.question && 
        Array.isArray(q.options) && 
        q.options.length === 4 && 
        typeof q.correctAnswer === 'number' &&
        q.correctAnswer >= 0 && 
        q.correctAnswer < 4
      );

      if (validQuestions.length === 0) {
        throw new Error('No valid questions generated');
      }

      const newSession: QuizSession = {
        questions: validQuestions,
        answers: new Array(validQuestions.length).fill(null),
        score: null,
        completed: false,
        startTime: new Date()
      };

      setSession(newSession);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowResults(false);

      toast({
        title: "Quiz Generated",
        description: `${validQuestions.length} questions ready to answer`
      });

    } catch (error: any) {
      console.error('Quiz generation error:', error);
      setError(error.message || 'Failed to generate quiz');
      toast({
        title: "Generation Failed",
        description: error.message || 'Please try again',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [content, questionCount, difficulty, selectedProvider, getProviderConfig]);

  const handleAnswerSubmit = () => {
    if (!session || selectedAnswer === null) return;

    const newAnswers = [...session.answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    
    setSession({
      ...session,
      answers: newAnswers
    });

    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    } else {
      // Quiz completed
      const score = calculateScore(newAnswers, session.questions);
      setSession({
        ...session,
        answers: newAnswers,
        score,
        completed: true,
        endTime: new Date()
      });
      setShowResults(true);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (session?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(session?.answers[currentQuestionIndex + 1] || null);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(session?.answers[currentQuestionIndex - 1] || null);
    }
  };

  const calculateScore = (answers: (number | null)[], questions: Question[]): number => {
    const correct = answers.reduce((count, answer, index) => {
      return count + (answer === questions[index].correctAnswer ? 1 : 0);
    }, 0);
    return Math.round((correct / questions.length) * 100);
  };

  const resetQuiz = useCallback(() => {
    setSession(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResults(false);
    setError(null);
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Quiz Generation Failed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Button onClick={generateQuiz} disabled={isGenerating}>
              Try Again
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <CardTitle>Multiple Choice Quiz</CardTitle>
          <CardDescription>
            Generate an interactive quiz from your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="font-semibold">{questionCount}</div>
              <div className="text-sm text-muted-foreground">Questions</div>
            </div>
            <div className="text-center">
              <div className="font-semibold capitalize">{difficulty}</div>
              <div className="text-sm text-muted-foreground">Difficulty</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">4</div>
              <div className="text-sm text-muted-foreground">Options Each</div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={generateQuiz} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Quiz'}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const score = session.score || 0;
    const correct = session.answers.filter((answer, index) => 
      answer === session.questions[index].correctAnswer
    ).length;

    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <CardTitle>Quiz Complete!</CardTitle>
          <CardDescription>
            Your final score: {score}%
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">{score}%</div>
            <div className="text-muted-foreground">
              {correct} out of {session.questions.length} correct
            </div>
          </div>

          <Progress value={score} className="w-full h-3" />

          <div className="space-y-4">
            {session.questions.map((question, index) => {
              const userAnswer = session.answers[index];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <div key={question.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{question.question}</p>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className={userAnswer !== null ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}>
                            {userAnswer !== null ? question.options[userAnswer] : 'No answer'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div>
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="text-green-600">{question.options[question.correctAnswer]}</span>
                          </div>
                        )}
                        {question.explanation && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                            {question.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={resetQuiz}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {session.questions.length}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {difficulty}
          </Badge>
        </div>
        <Progress value={progress} className="mb-4" />
        <CardTitle className="text-lg leading-relaxed">
          {currentQuestion.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup 
          value={selectedAnswer?.toString() || ''} 
          onValueChange={(value) => setSelectedAnswer(parseInt(value))}
        >
          {currentQuestion.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
              <RadioGroupItem value={index.toString()} id={`option-${index}`} />
              <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentQuestionIndex < session.questions.length - 1 ? (
              <Button 
                onClick={nextQuestion}
                variant="outline"
              >
                Skip
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : null}
            
            <Button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null}
            >
              {currentQuestionIndex === session.questions.length - 1 ? 'Finish Quiz' : 'Submit Answer'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
