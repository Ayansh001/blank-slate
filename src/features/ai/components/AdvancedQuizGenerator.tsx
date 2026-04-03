import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  Clock,
  Trophy,
  RotateCcw,
  Settings,
  Play,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';
import { QuizGeneratingLoader } from '@/components/ui/QuizGeneratingLoader';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIProvider } from '@/features/ai/hooks/useAIProvider';
import { AdvancedQuizConfig, AdvancedQuestion, AdvancedQuizSession } from '../types/advancedQuiz';
import { AdvancedQuizService } from '../services/AdvancedQuizService';
import { AdvancedQuizValidator } from '../services/AdvancedQuizValidator';
import { AIProviderValidator } from '../services/AIProviderValidator';
import { AdvancedQuizConfigPanel } from './AdvancedQuizConfigPanel';
import { AdvancedQuizInterface } from './AdvancedQuizInterface';
import { AdvancedQuizResults } from './AdvancedQuizResults';
import { QuizErrorBoundary } from './QuizErrorBoundary';
import { QuizAnalytics } from './QuizAnalytics';
import { ResumeQuizDialog } from './ResumeQuizDialog';
import { AnswerNormalizer } from '../utils/answerNormalization';
import { NotificationService } from '@/services/NotificationService';
import { useToast } from '@/hooks/use-toast';
import { useQuizAutoSave, QuizAutoSaveData } from '@/hooks/useQuizAutoSave';
import { logger } from '../utils/DebugLogger';

interface AdvancedQuizGeneratorProps {
  content: string;
  source?: {
    type: 'file' | 'note';
    id: string;
    name: string;
  };
  onClose?: () => void;
}

type QuizState = 'config' | 'generating' | 'ready' | 'taking' | 'completed';

export function AdvancedQuizGenerator({ content, source, onClose }: AdvancedQuizGeneratorProps) {
  const { user } = useAuth();
  const { selectedProvider, getProviderConfig } = useAIProvider();
  const { toast } = useToast();
  
  const [quizState, setQuizState] = useState<QuizState>('config');
  const [config, setConfig] = useState<AdvancedQuizConfig | null>(null);
  const [questions, setQuestions] = useState<AdvancedQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [quizSession, setQuizSession] = useState<AdvancedQuizSession | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingVisuals, setGeneratingVisuals] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [savedQuizData, setSavedQuizData] = useState<QuizAutoSaveData | null>(null);

  // Check for saved quiz on component mount
  useEffect(() => {
    const checkForSavedQuiz = () => {
      // Create a temporary auto-save instance to check for saved data
      const tempQuizId = `quiz_${source?.id || 'temp'}`;
      const storageKey = `quiz_autosave_${tempQuizId}`;
      
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved) as QuizAutoSaveData;
          // Convert date strings back to Date objects
          data.startTime = new Date(data.startTime);
          data.lastSaved = new Date(data.lastSaved);
          
          // Only show resume dialog if the saved quiz is less than 24 hours old
          const hoursSinceLastSave = (Date.now() - data.lastSaved.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastSave < 24) {
            setSavedQuizData(data);
            setShowResumeDialog(true);
          } else {
            // Clean up old saved data
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        logger.error('AdvancedQuizGenerator', 'Failed to check for saved quiz', error);
      }
    };

    checkForSavedQuiz();
  }, [source?.id]);

  const handleResumeSavedQuiz = useCallback((data: QuizAutoSaveData) => {
    setConfig(data.config);
    setQuestions(data.questions);
    setCurrentQuestionIndex(data.questionIndex);
    setUserAnswers(data.answers);
    setStartTime(data.startTime);
    setQuizState('taking');
    
    toast({
      title: 'Quiz resumed',
      description: `Continuing from question ${data.questionIndex + 1}`
    });
  }, [toast]);

  const handleStartFreshQuiz = useCallback(() => {
    // Clear any saved data
    if (savedQuizData) {
      const storageKey = `quiz_autosave_${savedQuizData.quizId}`;
      localStorage.removeItem(storageKey);
    }
    setSavedQuizData(null);
  }, [savedQuizData]);

  const handleConfigComplete = useCallback(async (newConfig: AdvancedQuizConfig) => {
    const validation = AdvancedQuizValidator.validateConfig(newConfig);
    if (!validation.valid) {
      toast({
        title: 'Invalid configuration',
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setConfig(newConfig);
    setQuizState('generating');
    setError(null);
    
    // Check if visual content will be generated
    const hasVisualTypes = newConfig.questionTypes.some(type => 
      ['diagram_labeling', 'chart_analysis', 'visual_interpretation'].includes(type)
    );
    
    if (hasVisualTypes) {
      setGeneratingVisuals(true);
      toast({
        title: 'Generating visual content',
        description: 'Creating diagrams and charts for your quiz questions. This may take a moment.'
      });
    }

    try {
      logger.info('AdvancedQuizGenerator', 'Starting quiz generation with config', newConfig);

      if (!selectedProvider) {
        throw new Error('No AI provider selected');
      }

      const providerConfig = await getProviderConfig();
      if (!providerConfig) {
        throw new Error('No AI provider configuration available');
      }

      // Validate provider before generation
      const providerValidation = AIProviderValidator.validateBeforeGeneration(providerConfig);
      if (!providerValidation.isValid) {
        throw new Error(`Provider validation failed: ${providerValidation.errors.join(', ')}`);
      }

      const sanitizedContent = AdvancedQuizValidator.sanitizeContent(content);
      const generatedQuestions = await AdvancedQuizService.generateAdvancedQuiz(
        sanitizedContent,
        newConfig,
        providerConfig
      );

      // Enhanced validation: Check question count match
      if (generatedQuestions.length !== newConfig.questionCount) {
        logger.warn('AdvancedQuizGenerator', 'Question count mismatch', {
          requested: newConfig.questionCount,
          generated: generatedQuestions.length
        });
        
        if (generatedQuestions.length < newConfig.questionCount) {
          toast({
            title: `Generated ${generatedQuestions.length} questions instead of ${newConfig.questionCount}`,
            description: 'Limited by available content. Quiz will proceed with available questions.'
          });
        }
      }

      // Validate generated questions
      const invalidQuestions = generatedQuestions.filter(q => 
        !AdvancedQuizValidator.validateQuestion(q).valid
      );

      if (invalidQuestions.length > 0) {
        logger.warn('AdvancedQuizGenerator', 'Some questions failed validation', {
          invalidCount: invalidQuestions.length,
          totalCount: generatedQuestions.length
        });
      }

      const validQuestions = generatedQuestions.filter(q => 
        AdvancedQuizValidator.validateQuestion(q).valid
      );

      if (validQuestions.length === 0) {
        throw new Error('No valid questions were generated');
      }

      setQuestions(validQuestions);
      setUserAnswers(new Array(validQuestions.length).fill(null));
      setQuizState('ready');
      setGeneratingVisuals(false);
      
      const visualCount = validQuestions.filter(q => q.visualContent).length;
      toast({
        title: 'Advanced quiz generated successfully!',
        description: `${validQuestions.length} questions ready${visualCount > 0 ? ` with ${visualCount} visual elements` : ''}`
      });

    } catch (error: any) {
      logger.error('AdvancedQuizGenerator', 'Quiz generation failed', error);
      setError(error.message || 'Failed to generate quiz');
      setQuizState('config');
      setGeneratingVisuals(false);
      toast({
        title: 'Quiz generation failed',
        description: error.message || 'Please try again',
        variant: "destructive"
      });
    }
  }, [content, selectedProvider, getProviderConfig, toast]);

  const startQuiz = useCallback(() => {
    setQuizState('taking');
    setCurrentQuestionIndex(0);
    setStartTime(new Date());
    setUserAnswers(new Array(questions.length).fill(null));
  }, [questions.length]);

  const handleAnswerSubmit = useCallback((answer: any) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setUserAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeQuiz(newAnswers);
    }
  }, [currentQuestionIndex, questions.length, userAnswers]);

  const completeQuiz = useCallback(async (answers: any[]) => {
    if (!config || !startTime || !user) return;

    try {
      logger.info('AdvancedQuizGenerator', 'Completing advanced quiz');

      // Validate answers
      const validation = AdvancedQuizValidator.validateQuizSession(questions, answers);
      if (!validation.valid) {
        logger.warn('AdvancedQuizGenerator', 'Answer validation issues', validation.errors);
      }

      // Calculate detailed results using improved answer comparison
      const detailedResults = calculateDetailedResults(questions, answers);
      const score = (detailedResults.correctCount / questions.length) * 100;
      const timeSpent = Math.round((Date.now() - startTime.getTime()) / 60000);

      const session: AdvancedQuizSession = {
        id: '',
        user_id: user.id,
        file_id: source?.type === 'file' ? source.id : undefined,
        note_id: source?.type === 'note' ? source.id : undefined,
        config,
        questions,
        answers,
        score,
        detailedResults: {
          categoryScores: detailedResults.categoryScores,
          timePerQuestion: detailedResults.timePerQuestion,
          difficultyProgress: detailedResults.difficultyProgress
        },
        time_spent_minutes: timeSpent,
        completed: true,
        ai_service: selectedProvider || 'openai',
        model_used: 'gpt-4o-mini',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      // Trigger quiz completion notification
      const quizName = source?.name ? `${source.name} Advanced Quiz` : 'Advanced Quiz';
      NotificationService.quizCompleted(quizName, Math.round(score));

      // Save session (non-blocking)
      AdvancedQuizService.saveAdvancedQuizSession(session).catch(error => {
        logger.error('AdvancedQuizGenerator', 'Failed to save quiz session', error);
        toast({
          title: 'Failed to save quiz results',
          variant: "destructive"
        });
      });

      // Clear auto-saved data on successful completion
      if (savedQuizData) {
        const storageKey = `quiz_autosave_${savedQuizData.quizId}`;
        localStorage.removeItem(storageKey);
      }

      setQuizSession(session);
      setQuizState('completed');
      toast({
        title: 'Quiz completed!',
        description: `Score: ${score.toFixed(1)}%`
      });

    } catch (error: any) {
      logger.error('AdvancedQuizGenerator', 'Error completing quiz', error);
      toast({
        title: 'Error completing quiz',
        description: error.message,
        variant: "destructive"
      });
    }
  }, [config, startTime, user, source, questions, selectedProvider, toast, savedQuizData]);

  const calculateDetailedResults = (questions: AdvancedQuestion[], answers: any[]) => {
    const categoryScores: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const timePerQuestion: number[] = [];
    const difficultyProgress: number[] = [];
    let correctCount = 0;

    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = AnswerNormalizer.compareAnswers(userAnswer, question.correctAnswer, question.type);
      
      if (isCorrect) correctCount++;

      // Track category performance
      question.metadata.categories.forEach(category => {
        if (!categoryScores[category]) {
          categoryScores[category] = 0;
          categoryCounts[category] = 0;
        }
        categoryScores[category] += isCorrect ? 100 : 0;
        categoryCounts[category]++;
      });

      // Estimate time (would be tracked in real implementation)
      timePerQuestion.push(question.metadata.estimatedTime);
      
      // Track difficulty progress
      difficultyProgress.push(question.metadata.difficulty);
    });

    // Calculate average category scores
    Object.keys(categoryScores).forEach(category => {
      categoryScores[category] = categoryScores[category] / categoryCounts[category];
    });

    return {
      correctCount,
      categoryScores,
      timePerQuestion,
      difficultyProgress
    };
  };

  const resetQuiz = useCallback(() => {
    setQuizState('config');
    setConfig(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setQuizSession(null);
    setStartTime(null);
    setError(null);
  }, []);

  const renderContent = () => {
    switch (quizState) {
      case 'config':
        return (
          <AdvancedQuizConfigPanel
            content={content}
            onConfigComplete={handleConfigComplete}
            initialConfig={config}
          />
        );

      case 'generating':
        return (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <QuizGeneratingLoader className="mx-auto" />
                <div className="text-xl font-semibold">Generating Advanced Quiz...</div>
                <div className="text-sm text-muted-foreground max-w-md">
                  Creating sophisticated questions tailored to your content and preferences. 
                  {generatingVisuals && ' Including visual diagrams and charts.'}
                </div>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Badge variant="secondary">AI Analysis</Badge>
                  <Badge variant="secondary">Question Generation</Badge>
                  {generatingVisuals && <Badge variant="secondary" className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Visual Content
                  </Badge>}
                  <Badge variant="secondary">Validation</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'ready':
        const visualQuestionCount = questions.filter(q => q.visualContent).length;
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle>Advanced Quiz Ready!</CardTitle>
              <CardDescription>
                {questions.length} sophisticated questions generated
                {visualQuestionCount > 0 && ` with ${visualQuestionCount} visual elements`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="font-semibold">{config.difficulty}</div>
                    <div className="text-sm text-muted-foreground">Difficulty</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{config.questionDepth}</div>
                    <div className="text-sm text-muted-foreground">Depth</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{config.questionTypes.length}</div>
                    <div className="text-sm text-muted-foreground">Types</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{questions.length}</div>
                    <div className="text-sm text-muted-foreground">Questions</div>
                  </div>
                </div>
              )}

              {visualQuestionCount > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Visual Content Included</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    This quiz includes {visualQuestionCount} questions with AI-generated diagrams and charts for enhanced learning.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button onClick={startQuiz} size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Start Advanced Quiz
                </Button>
                <Button variant="outline" onClick={() => setQuizState('config')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Modify Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'taking':
        return (
          <AdvancedQuizInterface
            questions={questions}
            currentIndex={currentQuestionIndex}
            onAnswerSubmit={handleAnswerSubmit}
            startTime={startTime}
            config={config}
            userAnswers={userAnswers}
          />
        );

      case 'completed':
        return quizSession ? (
          <div className="space-y-6">
            <AdvancedQuizResults
              session={quizSession}
              onReset={resetQuiz}
              onNewQuiz={() => setQuizState('config')}
            />
            <QuizAnalytics
              totalQuestions={questions.length}
              correctAnswers={Math.round((quizSession.score / 100) * questions.length)}
              timeSpent={quizSession.time_spent_minutes * 60}
              averageTimePerQuestion={(quizSession.time_spent_minutes * 60) / questions.length}
              categoryScores={quizSession.detailedResults?.categoryScores || {}}
              difficultyDistribution={{}}
            />
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <QuizErrorBoundary onReset={resetQuiz}>
      <div className="space-y-6">
        {/* Resume Quiz Dialog */}
        <ResumeQuizDialog
          open={showResumeDialog}
          onOpenChange={setShowResumeDialog}
          savedData={savedQuizData}
          onResume={handleResumeSavedQuiz}
          onStartFresh={handleStartFreshQuiz}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Advanced Quiz Generator</h2>
              <p className="text-muted-foreground">
                Sophisticated, customizable quiz generation with detailed analytics
              </p>
            </div>
          </div>
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4">
          {['config', 'generating', 'ready', 'taking', 'completed'].map((state, index) => (
            <div key={state} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                quizState === state 
                  ? 'bg-primary text-primary-foreground' 
                  : index < ['config', 'generating', 'ready', 'taking', 'completed'].indexOf(quizState)
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index < ['config', 'generating', 'ready', 'taking', 'completed'].indexOf(quizState) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 4 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  index < ['config', 'generating', 'ready', 'taking', 'completed'].indexOf(quizState)
                    ? 'bg-green-500'
                    : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {renderContent()}
      </div>
    </QuizErrorBoundary>
  );
}
