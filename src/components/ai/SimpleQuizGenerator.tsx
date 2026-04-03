import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Trophy,
  RotateCcw
} from 'lucide-react';
import { HamsterWheelIcon } from '@/components/ui/HamsterWheelIcon';
import { QuizGeneratingLoader } from '@/components/ui/QuizGeneratingLoader';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIProvider } from '@/features/ai/hooks/useAIProvider';
import { useAIHistoryPreferences } from '@/hooks/useAIHistoryPreferences';
import { useQuizTimer } from '@/hooks/useQuizTimer';
import { ProminentQuizTimer } from '@/features/ai/components/ProminentQuizTimer';
import { AIProviderFactory } from '@/features/ai/providers/AIProviderFactory';
import { AdvancedQuizGenerator } from '@/features/ai/components/AdvancedQuizGenerator';
import { HistoryIntegrationService } from '@/features/ai/services/HistoryIntegrationService';
import { validateQuizGeneratorProps } from '@/features/ai/types/uiProtection';
import { NotificationService } from '@/services/NotificationService';
import { toast } from 'sonner';
import { logger } from '@/features/ai/utils/DebugLogger';

interface SimpleQuizGeneratorProps {
  content: string;
  source?: {
    type: 'file' | 'note';
    id: string;
    name: string;
  };
}

interface Question {
  question: string;
  options?: string[];
  correctAnswer: any;
  explanation?: string;
}

interface Quiz {
  questions: Question[];
}

export function SimpleQuizGenerator({ content, source }: SimpleQuizGeneratorProps) {
  const { user } = useAuth();
  const { selectedProvider, getProviderConfig } = useAIProvider();
  const { getPreference } = useAIHistoryPreferences();
  
  // UI Protection: Validate props match the locked interface
  if (!validateQuizGeneratorProps({ content, source })) {
    logger.error('SimpleQuizGenerator', 'Invalid props - UI protection activated');
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-lg font-medium mb-2">Content Required</div>
          <div className="text-sm text-muted-foreground">
            Please select content from the sidebar to generate a quiz.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rich UI State Management (LOCKED - must maintain these exact states)
  const [quizType, setQuizType] = useState<string>('multiple_choice');
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [customQuestionCount, setCustomQuestionCount] = useState<string>('');
  const [isCustomQuestions, setIsCustomQuestions] = useState<boolean>(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [showAdvancedQuiz, setShowAdvancedQuiz] = useState(false);

  // Timer functionality
  const {
    elapsedSeconds,
    formattedTime,
    isRunning: timerIsRunning,
    isPaused,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer
  } = useQuizTimer(startTime);

  // Check if quiz history saving is enabled
  const isQuizHistoryEnabled = () => {
    const preference = getPreference('quiz_sessions');
    return preference.is_enabled;
  };

  // LOCKED UI FEATURE: Custom question count handling
  const handleQuestionCountChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomQuestions(true);
      setQuestionCount(parseInt(customQuestionCount) || 10);
    } else {
      setIsCustomQuestions(false);
      setQuestionCount(parseInt(value));
    }
  };

  const handleCustomQuestionCountChange = (value: string) => {
    setCustomQuestionCount(value);
    const num = parseInt(value);
    if (num >= 1 && num <= 50) {
      setQuestionCount(num);
    }
  };

  // Enhanced quiz generation with proper error handling and history integration
  const generateQuiz = async () => {
    if (!content) {
      toast.error('Content is required');
      return;
    }

    if (!selectedProvider) {
      toast.error('Please select an AI provider first');
      return;
    }

    setIsGenerating(true);
    const historyEnabled = isQuizHistoryEnabled();
    
    try {
      logger.info('SimpleQuizGenerator', 'Starting quiz generation', { questionCount, quizType, difficulty });
      
      // Get provider configuration
      const providerConfig = await getProviderConfig();
      if (!providerConfig) {
        throw new Error('No AI provider configuration available');
      }

      // Create provider instance
      const provider = AIProviderFactory.createProvider(providerConfig);

      // Generate appropriate prompt based on quiz type
      let prompt;
      if (quizType === 'true_false') {
        prompt = `Create ${questionCount} true/false questions at ${difficulty} difficulty level from the following content. 

CRITICAL: Format your response as JSON with this EXACT structure:
{
  "questions": [
    {
      "question": "Statement to evaluate as true or false",
      "correctAnswer": true,
      "explanation": "Explanation of why this is true/false"
    }
  ]
}

IMPORTANT REQUIREMENTS:
- The "correctAnswer" field MUST be a boolean value (true or false), NOT a string
- Each question should be a clear statement that can be evaluated as true or false
- Provide a brief explanation for each answer

Content: ${content.slice(0, 3000)}`;
      } else {
        prompt = `Create ${questionCount} ${quizType.replace('_', ' ')} questions at ${difficulty} difficulty level from the following content. Format your response as JSON with this structure: {"questions": [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": "A", "explanation": "..."}]}. Content: ${content.slice(0, 3000)}`;
      }

      const result = await provider.generateResponse({
        prompt,
        maxTokens: 2000,
        temperature: 0.7
      });

      if (!result.content) {
        throw new Error('Failed to generate quiz');
      }

      // Parse the JSON response
      let parsedQuiz;
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : result.content;
        parsedQuiz = JSON.parse(jsonString);
        
        console.log('🔍 QUIZ DEBUG - Parsed quiz from AI:', parsedQuiz);
        console.log('🔍 QUIZ DEBUG - Sample question correctAnswer:', parsedQuiz.questions?.[0]?.correctAnswer, 'Type:', typeof parsedQuiz.questions?.[0]?.correctAnswer);
        
      } catch (parseError) {
        logger.error('SimpleQuizGenerator', 'Failed to parse JSON response', parseError);
        throw new Error('Invalid response format from AI provider');
      }

      if (!parsedQuiz.questions || parsedQuiz.questions.length === 0) {
        throw new Error('No valid quiz questions received');
      }

      setQuiz(parsedQuiz);
      setUserAnswers(new Array(parsedQuiz.questions.length).fill(null));
      
      // Show appropriate toast based on history status
      if (historyEnabled) {
        toast.success('Quiz generated successfully!');
      } else {
        toast.success('Quiz generated successfully!', {
          description: 'Not saved to history - history is disabled'
        });
      }
      
      logger.info('SimpleQuizGenerator', 'Quiz generated successfully', { questionsCount: parsedQuiz.questions.length });
    } catch (error: any) {
      logger.error('SimpleQuizGenerator', 'Quiz generation failed', error);
      toast.error('Quiz generation failed', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Quiz completion with enhanced history integration
  const completeQuiz = (answers: any[]) => {
    if (!quiz || !startTime) return;

    console.log('🔍 EVALUATION DEBUG - Starting quiz evaluation');
    console.log('🔍 EVALUATION DEBUG - Quiz type:', quizType);
    console.log('🔍 EVALUATION DEBUG - Total questions:', quiz.questions.length);

    let correctCount = 0;
    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = question.correctAnswer;

      let isCorrect = false;

      if (quizType === 'multiple_choice' && userAnswer === correctAnswer) {
        isCorrect = true;
        correctCount++;
      } else if (quizType === 'true_false') {
        const normalizedUserAnswer = userAnswer === true || userAnswer === 'true' || userAnswer === 'True';
        const normalizedCorrectAnswer = correctAnswer === true || correctAnswer === 'true' || correctAnswer === 'True';
        
        if (normalizedUserAnswer === normalizedCorrectAnswer) {
          isCorrect = true;
          correctCount++;
        }
      }
    });

    const finalScore = (correctCount / quiz.questions.length) * 100;
    const timeSpent = Math.round((new Date().getTime() - startTime.getTime()) / 60000);

    console.log('🔍 EVALUATION DEBUG - Final Results:');
    console.log(`  Correct Count: ${correctCount}`);
    console.log(`  Total Questions: ${quiz.questions.length}`);
    console.log(`  Final Score: ${finalScore}%`);

    setScore(finalScore);
    setIsQuizCompleted(true);
    
    // Trigger quiz completion notification
    const quizName = source?.name ? `${source.name} Quiz` : `${quizType.replace('_', ' ')} Quiz`;
    NotificationService.quizCompleted(quizName, Math.round(finalScore));
    
    // Background history integration - only if history is enabled
    if (user && isQuizHistoryEnabled()) {
      HistoryIntegrationService.saveQuizToHistory({
        user_id: user.id,
        file_id: source?.type === 'file' ? source.id : undefined,
        note_id: source?.type === 'note' ? source.id : undefined,
        quiz_type: quizType,
        questions: quiz as any,
        answers: answers as any,
        score: finalScore,
        time_spent_minutes: timeSpent,
        completed: true,
        ai_service: selectedProvider || 'openai',
        model_used: 'gpt-4o-mini'
      }).catch(error => {
        // Silent error handling - don't disrupt quiz experience
        console.warn('History save failed (non-critical):', error);
      });
    }
  };

  const startQuiz = () => {
    setIsQuizStarted(true);
    setCurrentQuestionIndex(0);
    const newStartTime = new Date();
    setStartTime(newStartTime);
    setUserAnswers(new Array(quiz?.questions.length || 0).fill(null));
    setSelectedAnswer(null);
    // Timer will auto-start via useQuizTimer hook
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    } else {
      completeQuiz(newAnswers);
    }
  };

  const resetQuiz = () => {
    setQuiz(null);
    setIsQuizStarted(false);
    setIsQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setScore(0);
    setSelectedAnswer(null);
    setStartTime(null);
    resetTimer();
  };

  const renderQuestion = () => {
    if (!quiz || !isQuizStarted) return null;

    const question = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg mb-4">{question.question}</CardTitle>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                <HamsterWheelIcon className="h-4 w-4" />
                <span className="font-mono">{formattedTime}</span>
                {isPaused && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full ml-2">
                    Paused
                  </span>
                )}
              </div>
            </div>
            
            <Progress value={progress} className="w-full mt-2" />
          </CardHeader>

          <CardContent className="space-y-4">
            {quizType === 'multiple_choice' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswer === option[0] ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto p-4"
                    onClick={() => setSelectedAnswer(option[0])}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}

            {quizType === 'true_false' && (
              <div className="flex gap-4">
                <Button
                  variant={selectedAnswer === true ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSelectedAnswer(true)}
                >
                  True
                </Button>
                <Button
                  variant={selectedAnswer === false ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setSelectedAnswer(false)}
                >
                  False
                </Button>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              <Button
                onClick={submitAnswer}
                disabled={selectedAnswer === null}
              >
                {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish Quiz' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderResults = () => {
    if (!isQuizCompleted || !quiz) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
            <CardDescription>
              Your Score: {score.toFixed(1)}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((score / 100) * quiz.questions.length)}
                </div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {quiz.questions.length - Math.round((score / 100) * quiz.questions.length)}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {startTime && Math.round((Date.now() - startTime.getTime()) / 60000)}
                </div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button onClick={resetQuiz} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                New Quiz
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quiz.questions.map((question, index) => {
              const userAnswer = userAnswers[index];
              let isCorrect = false;
              
              if (quizType === 'multiple_choice') {
                isCorrect = userAnswer === question.correctAnswer;
              } else if (quizType === 'true_false') {
                const normalizedUserAnswer = userAnswer === true || userAnswer === 'true' || userAnswer === 'True';
                const normalizedCorrectAnswer = question.correctAnswer === true || question.correctAnswer === 'true' || question.correctAnswer === 'True';
                isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
              }
              
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{question.question}</div>
                      {question.explanation && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {question.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderQuizTypeSelection = () => (
    <div>
      <label className="text-sm font-medium">Quiz Type</label>
      <Select value={quizType} onValueChange={(value) => {
        if (value === 'advanced') {
          setShowAdvancedQuiz(true);
        } else {
          setQuizType(value);
        }
      }}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
          <SelectItem value="true_false">True/False</SelectItem>
          <SelectItem value="advanced">🚀 Advanced Quiz Generator</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (showAdvancedQuiz) {
    return (
      <Dialog open={showAdvancedQuiz} onOpenChange={setShowAdvancedQuiz}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <AdvancedQuizGenerator
            content={content}
            source={source}
            onClose={() => setShowAdvancedQuiz(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (isQuizCompleted) {
    return renderResults();
  }

  if (quiz && isQuizStarted) {
    return renderQuestion();
  }

  if (quiz && !isQuizStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Ready!</CardTitle>
          <CardDescription>
            {quiz.questions.length} {quizType.replace('_', ' ')} questions at {difficulty} difficulty
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startQuiz} className="w-full">
            Start Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <QuizGeneratingLoader className="mx-auto" />
            <div className="text-lg font-medium">Generating your quiz...</div>
            <div className="text-sm text-muted-foreground">
              This may take a few moments
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Quiz Generator
        </CardTitle>
        <CardDescription>
          Generate personalized quizzes from your content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LOCKED FEATURE: Content Preview */}
        {content && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Selected Content Preview</div>
            <div className="text-sm text-muted-foreground">
              {content.slice(0, 150)}{content.length > 150 && '...'}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {content.length} characters available for quiz generation
            </div>
          </div>
        )}

        {/* LOCKED FEATURE: Rich Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {renderQuizTypeSelection()}

          <div>
            <label className="text-sm font-medium">Difficulty</label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Questions</label>
            <Select 
              value={isCustomQuestions ? 'custom' : questionCount.toString()} 
              onValueChange={handleQuestionCountChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* LOCKED FEATURE: Custom question count input */}
        {isCustomQuestions && (
          <div className="space-y-2">
            <Label htmlFor="customQuestions">Number of Questions (1-50)</Label>
            <Input
              id="customQuestions"
              type="number"
              min="1"
              max="50"
              value={customQuestionCount}
              onChange={(e) => handleCustomQuestionCountChange(e.target.value)}
              placeholder="Enter number of questions"
            />
          </div>
        )}

        {/* LOCKED FEATURE: Source information alert */}
        {source && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Quiz will be generated from: <strong>{source.name}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* LOCKED FEATURE: Generate quiz button */}
        <Button 
          onClick={generateQuiz} 
          className="w-full"
          disabled={!content || (isCustomQuestions && (!customQuestionCount || parseInt(customQuestionCount) < 1 || parseInt(customQuestionCount) > 50))}
        >
          <Brain className="h-4 w-4 mr-2" />
          Generate Quiz
        </Button>
      </CardContent>
    </Card>
  );
}
