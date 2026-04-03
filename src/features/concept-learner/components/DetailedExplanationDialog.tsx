
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: 'concept' | 'definition' | 'example' | 'application';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  details: string;
  relatedConcepts: string[];
  correctCount: number;
  incorrectCount: number;
  confidenceLevel: number;
  shortSummary?: string;
  comprehensiveExplanation?: string;
}

interface DetailedExplanationDialogProps {
  currentCard: Flashcard;
  conceptName: string;
}

interface DetailedExplanation {
  detailedExplanation: string;
  practicalApplications: string[];
  relatedConcepts: Array<{
    name: string;
    relationship: string;
  }>;
  studyTips: string[];
  examples: string[];
  keyInsights: string[];
}

export function DetailedExplanationDialog({ currentCard, conceptName }: DetailedExplanationDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [detailedData, setDetailedData] = useState<DetailedExplanation | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchDetailedExplanation = async () => {
    if (detailedData || isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching detailed explanation for:', currentCard.front);
      
      // Determine which function to use based on user's active AI service
      let functionName = 'gemini-concept-learner-v2';
      let requestBody: any = { concept: `${conceptName}: ${currentCard.front}` };
      
      if (user) {
        try {
          const { data: activeConfig } = await supabase
            .from('ai_service_configs')
            .select('service_name')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (activeConfig?.service_name === 'openai') {
            functionName = 'openai-enhanced-concept-learner';
            requestBody = {
              topic: `${conceptName}: ${currentCard.front}`,
              difficulty: 'intermediate',
              type: 'explanation',
              mode: 'advanced',
              fileContent: null
            };
          }
        } catch (error) {
          console.warn('Failed to check AI config, using Gemini:', error);
        }
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (error) throw new Error(error.message);

      if (data?.success && data?.result) {
        const result = data.result;
        const explanation: DetailedExplanation = {
          detailedExplanation: result.explanation || result.comprehensiveExplanation || 'No detailed explanation available',
          practicalApplications: result.examples || [],
          relatedConcepts: result.relatedConcepts || [],
          studyTips: result.studyTips || [],
          examples: result.examples || [],
          keyInsights: result.keyPoints || []
        };
        
        setDetailedData(explanation);
        toast.success('Detailed explanation loaded!');
      } else {
        throw new Error('Failed to get detailed explanation');
      }
    } catch (err: any) {
      console.error('Detailed explanation error:', err);
      toast.error('Failed to load detailed explanation', {
        description: err.message || 'Please try again'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    if (open) {
      // PRIORITY 1: Check for cached comprehensive explanation first
      if (currentCard.comprehensiveExplanation && !detailedData) {
        console.log('Using cached comprehensive explanation:', currentCard.comprehensiveExplanation);
        const cachedExplanation: DetailedExplanation = {
          detailedExplanation: currentCard.comprehensiveExplanation,
          practicalApplications: [currentCard.details].filter(Boolean),
          relatedConcepts: currentCard.relatedConcepts.map(concept => ({
            name: concept,
            relationship: `Related to ${conceptName}`
          })),
          studyTips: [
            `Review this ${currentCard.category} concept regularly to build long-term retention`,
            `Connect ${currentCard.front} to real-world examples you encounter`,
            `Practice explaining this concept in your own words to test understanding`,
            `Create mental associations between this and other concepts you know`
          ],
          examples: [currentCard.back, currentCard.details].filter(Boolean),
          keyInsights: [
            `Understanding ${currentCard.front} is fundamental to mastering ${conceptName}`,
            `This ${currentCard.category} connects to broader principles in the subject area`,
            `Regular practice with this concept will improve your overall comprehension`
          ]
        };
        setDetailedData(cachedExplanation);
        return; // Exit early - no AI call needed
      }
    }
  };

  const hasCachedData = !!currentCard.comprehensiveExplanation;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4 group"
          onClick={(e) => e.stopPropagation()}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Explore Details
          {hasCachedData && (
            <Badge variant="secondary" className="ml-2 text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Instant
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {currentCard.category}: {conceptName}
          </DialogTitle>
          <DialogDescription>
            {hasCachedData 
              ? 'Comprehensive explanation with instant AI-generated insights' 
              : 'Generate detailed explanation with comprehensive insights and study strategies'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Original Card Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              Question
              <Badge variant="outline" className="text-xs">
                {currentCard.difficulty}
              </Badge>
            </h4>
            <p className="text-sm mb-3">{currentCard.front}</p>
            <h4 className="font-semibold mb-2">Answer</h4>
            <p className="text-sm">{currentCard.back}</p>
          </div>

          {/* Show detailed content immediately if cached */}
          {detailedData && (
            <>
              {/* Comprehensive Explanation */}
              <div>
                <h4 className="font-semibold mb-3 text-lg flex items-center gap-2">
                  🔍 Comprehensive Explanation
                  {hasCachedData && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI Generated
                    </Badge>
                  )}
                </h4>
                <p className="text-sm leading-relaxed bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border">
                  {detailedData.detailedExplanation}
                </p>
              </div>

              {/* Key Insights */}
              {detailedData.keyInsights && detailedData.keyInsights.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    💡 Key Insights
                  </h4>
                  <div className="space-y-2">
                    {detailedData.keyInsights.map((insight, index) => (
                      <div key={index} className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded border-l-4 border-yellow-400">
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Tips */}
              {detailedData.studyTips && detailedData.studyTips.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    🎯 Smart Study Strategies
                  </h4>
                  <div className="space-y-2">
                    {detailedData.studyTips.map((tip, index) => (
                      <div key={index} className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded border-l-4 border-purple-400">
                        <p className="text-sm">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Practical Applications */}
              {detailedData.practicalApplications && detailedData.practicalApplications.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    🚀 Practical Applications
                  </h4>
                  <div className="grid gap-3">
                    {detailedData.practicalApplications.map((app, index) => (
                      <div key={index} className="bg-green-50 dark:bg-green-950/20 p-3 rounded border">
                        <p className="text-sm">{app}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Concepts */}
              {detailedData.relatedConcepts && detailedData.relatedConcepts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    🔗 Related Concepts
                  </h4>
                  <div className="space-y-2">
                    {detailedData.relatedConcepts.map((concept, index) => (
                      <div key={index} className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded border flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{concept.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{concept.relationship}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Fallback content when no detailed data and not cached */}
          {!detailedData && !hasCachedData && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Basic Details</h4>
                <p className="text-sm leading-relaxed bg-muted/50 p-3 rounded">{currentCard.details}</p>
              </div>
              
              {currentCard.relatedConcepts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Related Concepts</h4>
                  <div className="space-y-2">
                    {currentCard.relatedConcepts.map((concept, index) => (
                      <div key={index} className="p-2 bg-muted rounded text-sm">
                        {concept}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1">
                {currentCard.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>

              <Button 
                onClick={fetchDetailedExplanation}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating detailed explanation...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Generate Detailed AI Explanation
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Loading only when fetching new data */}
          {isLoading && !hasCachedData && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Generating comprehensive explanation...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
