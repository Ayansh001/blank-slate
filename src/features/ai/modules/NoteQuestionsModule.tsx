
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAIProvider } from '../hooks/useAIProvider';
import { AIProviderFactory } from '../providers/AIProviderFactory';
import { EnhancementResult } from '../types/providers';
import { logger } from '../utils/DebugLogger';
import { toast } from 'sonner';

function showClassifiedError(error: any, fallbackTitle: string) {
  const code = error?.code || '';
  const msg = error?.message || 'Unknown error';
  if (code === 'invalid_key') {
    toast.error('Invalid API key', { description: 'Check your API key in Settings → AI Configuration' });
  } else if (code === 'quota_exceeded') {
    toast.error('API quota exceeded', { description: 'Check your billing or try again later' });
  } else if (code === 'rate_limited') {
    toast.error('Rate limited', { description: 'Please wait a moment and try again' });
  } else if (code === 'network_error') {
    toast.error('Network error', { description: 'Check your internet connection and try again' });
  } else {
    toast.error(fallbackTitle, { description: msg });
  }
}

interface NoteQuestionsModuleProps {
  content: string;
  onQuestionsGenerated?: (questions: string[]) => void;
  className?: string;
}

export const NoteQuestionsModule: React.FC<NoteQuestionsModuleProps> = ({
  content,
  onQuestionsGenerated,
  className,
}) => {
  const { selectedProvider, getProviderConfig } = useAIProvider();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<EnhancementResult<any> | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const generateQuestions = async () => {
    if (!content.trim()) {
      toast.error('No content', { description: 'Please provide content to generate study questions from.' });
      return;
    }

    try {
      setIsGenerating(true);
      setResult(null);
      const startTime = Date.now();

      logger.info('NoteQuestionsModule', 'Starting questions generation', {
        provider: selectedProvider,
        contentLength: content.length,
      });

      const config = await getProviderConfig();
      if (!config) {
        toast.error('No API key configured', { description: 'Go to Settings → AI Configuration to add your key.' });
        return;
      }

      const provider = AIProviderFactory.createProvider(config);
      
      const prompt = `Generate 5-8 thoughtful study questions with detailed answers based on the following content. 

Return your response as valid JSON in this exact format:
{
  "studyQuestions": [
    {
      "question": "Question text here",
      "answer": "Detailed answer here",
      "type": "conceptual",
      "difficulty": "medium"
    }
  ],
  "reviewQuestions": [
    {
      "question": "Quick review question",
      "answer": "Brief answer"
    }
  ]
}

Content to analyze:
${content}

CRITICAL: Every question MUST have a corresponding answer. Make answers educational and comprehensive.`;

      const response = await provider.generateResponse({
        prompt,
        systemPrompt: 'You are an expert educator who creates insightful questions with detailed answers to help students learn effectively. Always return valid JSON format.',
        maxTokens: 2000,
        temperature: 0.6
      });

      const duration = Date.now() - startTime;
      setProcessingTime(duration);

      console.log('[NoteQuestionsModule] Raw AI response content:', response.content);

      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(response.content);
        console.log('[NoteQuestionsModule] Parsed AI response:', parsedQuestions);
      } catch (parseError) {
        console.error('[NoteQuestionsModule] Failed to parse questions response:', response.content);
        throw new Error('Failed to parse questions response');
      }

      const enhancementResult: EnhancementResult<any> = {
        success: true,
        data: parsedQuestions,
        provider: selectedProvider || 'openai',
        model: config.model,
        processingTime: duration,
      };

      setResult(enhancementResult);
      
      if (onQuestionsGenerated) {
        const questionStrings = [
          ...(parsedQuestions.studyQuestions || []).map((q: any) => q.question),
          ...(parsedQuestions.reviewQuestions || []).map((q: any) => typeof q === 'object' ? q.question : q)
        ];
        onQuestionsGenerated(questionStrings);
      }

      toast.success('Study questions generated', {
        description: `Generated ${(parsedQuestions.studyQuestions?.length || 0) + (parsedQuestions.reviewQuestions?.length || 0)} questions with answers in ${(duration / 1000).toFixed(1)}s`,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error('NoteQuestionsModule', 'Failed to generate questions', {
        error: errorMessage,
        code: error?.code,
        provider: selectedProvider,
      });

      setResult({
        success: false,
        error: errorMessage,
        provider: selectedProvider || 'openai',
      });

      showClassifiedError(error, 'Question generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const retry = () => {
    generateQuestions();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="w-4 h-4" />
          Study Questions Generator
          {selectedProvider && (
            <Badge variant="secondary" className="text-xs">
              {selectedProvider}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={generateQuestions}
            disabled={isGenerating || !selectedProvider}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <HelpCircle className="w-4 h-4 mr-2" />
                Generate Questions with Answers
              </>
            )}
          </Button>
          
          {result && !result.success && (
            <Button
              onClick={retry}
              variant="outline"
              size="icon"
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {result && (
          <div className="space-y-3">
            {result.success && result.data ? (
              <div className="space-y-4">
                {result.data.studyQuestions && result.data.studyQuestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Study Questions</h4>
                    <div className="space-y-2">
                      {result.data.studyQuestions.map((q: any, index: number) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{q.type || 'general'}</Badge>
                            {q.difficulty && (
                              <Badge variant="secondary" className="text-xs">{q.difficulty}</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-1">{q.question}</p>
                          {q.answer && q.answer.trim() ? (
                            <details className="text-sm">
                              <summary className="cursor-pointer text-primary hover:underline">Show Answer</summary>
                              <div className="mt-2 p-2 bg-background rounded border-l-2 border-l-primary">
                                {q.answer}
                              </div>
                            </details>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              No answer provided by AI - please regenerate
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.data.reviewQuestions && result.data.reviewQuestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Quick Review Questions</h4>
                    <div className="space-y-2">
                      {result.data.reviewQuestions.map((q: any, index: number) => {
                        const question = typeof q === 'object' ? q.question : q;
                        const answer = typeof q === 'object' ? q.answer : null;
                        
                        return (
                          <div key={index} className="p-2 bg-muted/30 rounded">
                            <p className="text-sm font-medium mb-1">{question}</p>
                            {answer && answer.trim() ? (
                              <details className="text-sm">
                                <summary className="cursor-pointer text-primary hover:underline">Show Answer</summary>
                                <div className="mt-1 p-2 bg-background rounded border-l-2 border-l-primary">
                                  {answer}
                                </div>
                              </details>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">
                                No answer provided by AI - please regenerate
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{(result.data.studyQuestions?.length || 0) + (result.data.reviewQuestions?.length || 0)} questions generated</span>
                  {processingTime && (
                    <span>Generated in {(processingTime / 1000).toFixed(1)}s</span>
                  )}
                  {result.provider && (
                    <span>Using {result.provider}</span>
                  )}
                  {result.model && (
                    <span>Model: {result.model}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Question generation failed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.error}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedProvider && (
          <div className="p-3 bg-warning/10 rounded-lg">
            <p className="text-sm text-warning-foreground">
              No AI provider selected. Please configure an AI service first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
