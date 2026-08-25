import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Brain, ArrowRight, ArrowLeft, Star, Target, Image as ImageIcon, ZoomIn, Save } from 'lucide-react';
import { AdvancedQuestion } from '../types/advancedQuiz';
import { QuizTimer } from './QuizTimer';
import { ProminentQuizTimer } from './ProminentQuizTimer';
import { QuizSaveStatusIndicator } from './QuizSaveStatusIndicator';
import { QuizErrorBoundary } from './QuizErrorBoundary';
import { useQuizTimer } from '@/hooks/useQuizTimer';
import { useQuizAutoSave } from '@/hooks/useQuizAutoSave';

interface AdvancedQuizInterfaceProps {
  questions: AdvancedQuestion[];
  currentIndex: number;
  onAnswerSubmit: (answer: any) => void;
  startTime: Date | null;
  config?: any;
  userAnswers?: any[];
}

export function AdvancedQuizInterface({ 
  questions, 
  currentIndex, 
  onAnswerSubmit,
  startTime,
  config,
  userAnswers = []
}: AdvancedQuizInterfaceProps) {
  // Debug logging
  console.log('AdvancedQuizInterface - startTime:', startTime);
  console.log('AdvancedQuizInterface - currentIndex:', currentIndex);

  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [multiPartAnswers, setMultiPartAnswers] = useState<string[]>([]);
  const [imageExpanded, setImageExpanded] = useState(false);
  
  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  // Initialize timer with proper startTime
  const { 
    elapsedSeconds, 
    formattedTime, 
    isRunning, 
    isPaused, 
    pause, 
    resume, 
    reset,
    nextQuestion: recordQuestionTime 
  } = useQuizTimer(startTime);

  // Debug timer state
  console.log('AdvancedQuizInterface - Timer state:', { 
    elapsedSeconds, 
    formattedTime, 
    isRunning, 
    isPaused,
    startTime 
  });

  // Auto-save functionality with proper quiz ID
  const quizId = `quiz_${startTime?.getTime() || Date.now()}`;
  const {
    saveStatus,
    hasUnsavedChanges,
    forceSave,
    lastSaved
  } = useQuizAutoSave(
    quizId,
    currentIndex,
    userAnswers,
    startTime,
    elapsedSeconds,
    config,
    questions
  );

  // Reset answer when question changes
  useEffect(() => {
    setCurrentAnswer(null);
    setMultiPartAnswers([]);
    setImageExpanded(false);
  }, [currentIndex]);

  const resetAnswer = () => {
    setCurrentAnswer(null);
    setMultiPartAnswers([]);
    setImageExpanded(false);
  };

  const handleSubmit = () => {
    let finalAnswer = currentAnswer;
    
    if (currentQuestion.type === 'multi_part') {
      finalAnswer = multiPartAnswers;
    }
    
    // Record time for this question before moving to next
    recordQuestionTime();
    
    onAnswerSubmit(finalAnswer);
    resetAnswer();
  };

  const canSubmit = () => {
    if (currentQuestion.type === 'multi_part') {
      return multiPartAnswers.length === (currentQuestion.subQuestions?.length || 0) &&
             multiPartAnswers.every(answer => answer.trim() !== '');
    }
    return currentAnswer !== null && currentAnswer !== '';
  };

  const renderQuestionContent = () => {
    switch (currentQuestion.type) {
      case 'multiple_choice_extended':
        return (
          <div className="space-y-4">
            <RadioGroup value={currentAnswer || ''} onValueChange={setCurrentAnswer}>
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value={option[0]} id={`option-${index}`} className="mt-1" />
                  <label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-sm leading-relaxed">
                    {option}
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'true_false_explained':
        return (
          <div className="space-y-4">
            <RadioGroup value={currentAnswer?.toString() || ''} onValueChange={(value) => setCurrentAnswer(value === 'true')}>
              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="true" id="true" />
                <label htmlFor="true" className="flex-1 cursor-pointer font-medium">
                  True
                </label>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="false" id="false" />
                <label htmlFor="false" className="flex-1 cursor-pointer font-medium">
                  False
                </label>
              </div>
            </RadioGroup>
          </div>
        );

      case 'multi_part':
        return (
          <div className="space-y-4">
            {currentQuestion.subQuestions?.map((subQuestion, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium">
                  {index + 1}. {subQuestion}
                </label>
                <Textarea
                  placeholder="Your answer..."
                  value={multiPartAnswers[index] || ''}
                  onChange={(e) => {
                    const newAnswers = [...multiPartAnswers];
                    newAnswers[index] = e.target.value;
                    setMultiPartAnswers(newAnswers);
                  }}
                  className="min-h-[80px]"
                />
              </div>
            ))}
          </div>
        );

      case 'essay_short':
        return (
          <div className="space-y-2">
            <Textarea
              placeholder="Provide a detailed answer (2-3 sentences)..."
              value={currentAnswer || ''}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              className="min-h-[120px]"
            />
            <div className="text-xs text-muted-foreground">
              Expected length: 2-3 sentences
            </div>
          </div>
        );

      case 'scenario_based':
      case 'visual_interpretation':
      case 'chart_analysis':
      case 'comparison':
      case 'diagram_labeling':
        return (
          <div className="space-y-4">
            {currentQuestion.options ? (
              <RadioGroup value={currentAnswer || ''} onValueChange={setCurrentAnswer}>
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                    <RadioGroupItem value={option[0]} id={`option-${index}`} className="mt-1" />
                    <label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-sm leading-relaxed">
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Textarea
                placeholder="Provide your detailed analysis..."
                value={currentAnswer || ''}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                className="min-h-[120px]"
              />
            )}
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground">
            Question type not yet implemented: {currentQuestion.type}
          </div>
        );
    }
  };

  const renderVisualContent = () => {
    if (!currentQuestion.visualContent || !currentQuestion.visualContent.data) {
      return null;
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Visual Content</span>
            <Badge variant="secondary" className="text-xs">
              {currentQuestion.visualContent.type}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImageExpanded(!imageExpanded)}
            className="text-xs"
          >
            <ZoomIn className="h-3 w-3 mr-1" />
            {imageExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        
        <div className={`relative border-2 border-dashed border-muted rounded-lg overflow-hidden ${
          imageExpanded ? 'max-w-none' : 'max-w-md mx-auto'
        }`}>
          <img
            src={currentQuestion.visualContent.data}
            alt={currentQuestion.visualContent.description || 'Question visual content'}
            className={`w-full transition-all duration-300 ${
              imageExpanded ? 'max-h-none' : 'max-h-64 object-contain'
            }`}
            onError={(e) => {
              console.error('Failed to load visual content');
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          
          {currentQuestion.visualContent.description && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white p-2 text-xs">
              {currentQuestion.visualContent.description}
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Analyze the visual content above to answer the question below.
        </p>
      </div>
    );
  };

  return (
    <QuizErrorBoundary>
      <div className="space-y-6">
        {/* Prominent Timer Header - Force display with fallback */}
        <ProminentQuizTimer 
          elapsedSeconds={elapsedSeconds || 0}
          isPaused={isPaused || false}
          formattedTime={formattedTime || "0:00"}
        />

        {/* Progress Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              Question {currentIndex + 1} of {questions.length}
            </Badge>
            <Badge variant="secondary">
              {currentQuestion.type.replace('_', ' ').toUpperCase()}
            </Badge>
            {currentQuestion.visualContent && (
              <Badge variant="outline" className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Visual
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <QuizSaveStatusIndicator
              saveStatus={saveStatus}
              hasUnsavedChanges={hasUnsavedChanges}
              lastSaved={lastSaved}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={forceSave}
              className="h-8 px-2"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Progress value={progress} className="w-full" />

        {/* Question Card */}
        <Card>
          <CardHeader className="space-y-4">
            {/* Question Metadata */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Advanced Question</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: currentQuestion.metadata.difficulty }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                
                {currentQuestion.metadata.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {currentQuestion.metadata.categories.map(category => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Estimated Time</div>
                <div className="text-sm font-medium">
                  {Math.round(currentQuestion.metadata.estimatedTime / 60)} min
                </div>
              </div>
            </div>

            {/* Learning Objective */}
            {currentQuestion.metadata.learningObjective && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Learning Objective</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {currentQuestion.metadata.learningObjective}
                </p>
              </div>
            )}

            <Separator />

            {/* Visual Content */}
            {renderVisualContent()}
            
            {currentQuestion.visualContent && <Separator />}

            {/* Main Question */}
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {renderQuestionContent()}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {/* Previous question logic would go here */}}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit()}
                className="min-w-[120px]"
              >
                {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                {currentIndex < questions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Info Footer */}
        <div className="text-center text-sm text-muted-foreground">
          This question tests: <span className="font-medium">{currentQuestion.metadata.learningObjective}</span>
        </div>
      </div>
    </QuizErrorBoundary>
  );
}
