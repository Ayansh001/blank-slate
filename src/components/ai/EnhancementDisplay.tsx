import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Star, AlertTriangle, Copy, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { AnimatedSaveButton } from '@/components/ui/AnimatedSaveButton';
import { parseAIResponse, extractContentFromResponse } from '@/utils/aiResponseParser';
import { useNotes } from '@/hooks/useNotes';
import { toast } from 'sonner';
import { useState } from 'react';

interface EnhancementDisplayProps {
  enhancement: any;
  type: string;
  sourceTitle?: string;
}

export function EnhancementDisplay({ enhancement, type, sourceTitle }: EnhancementDisplayProps) {
  const { createNote, isCreating } = useNotes();
  const [openAnswers, setOpenAnswers] = useState<{ [key: string]: boolean }>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({}); // Track individual save states

  const toggleAnswer = (questionId: string) => {
    setOpenAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleCopyKeyPoint = async (keyPoint: any) => {
    try {
      const textToCopy = `${keyPoint.point}\n\n${keyPoint.details ? keyPoint.details.join('\n• ') : ''}`;
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Key point copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy key point');
    }
  };

  const handleSaveKeyPoint = async (keyPoint: any, pointIndex: number) => {
    const saveKey = `keypoint-${pointIndex}`;
    setSavingStates(prev => ({ ...prev, [saveKey]: true }));
    
    try {
      const noteContent = `<h2>${keyPoint.point}</h2>\n${keyPoint.details ? keyPoint.details.map((detail: string) => `<p>• ${detail}</p>`).join('\n') : ''}`;
      
      createNote({
        title: keyPoint.point,
        content: noteContent,
        category: 'AI Generated',
        tags: ['key-point', 'ai-enhanced'],
        skipContentCheck: true
      });
      
      toast.success('Key point saved as new note');
    } catch (error) {
      console.error('Failed to save key point:', error);
      toast.error('Failed to save key point as note');
    } finally {
      setSavingStates(prev => ({ ...prev, [saveKey]: false }));
    }
  };

  const handleSaveSummary = async (content: any) => {
    const saveKey = 'summary';
    setSavingStates(prev => ({ ...prev, [saveKey]: true }));
    
    try {
      const summaryTitle = `Summary: ${sourceTitle || 'AI Generated'}`;
      let noteContent = `<h1>Summary</h1>\n<p>${content.summary}</p>`;
      
      if (content.keyTakeaways && content.keyTakeaways.length > 0) {
        noteContent += `\n<h2>Key Takeaways</h2>\n<ul>`;
        content.keyTakeaways.forEach((takeaway: string) => {
          noteContent += `<li>${takeaway}</li>`;
        });
        noteContent += `</ul>`;
      }

      if (content.wordCount) {
        noteContent += `\n<hr>\n<p><small>Original: ${content.wordCount.original} words | Summary: ${content.wordCount.summary} words</small></p>`;
      }

      createNote({
        title: summaryTitle,
        content: noteContent,
        category: 'AI Generated',
        tags: ['summary', 'ai-enhanced'],
        skipContentCheck: true
      });
      
      toast.success('Summary saved as new note');
    } catch (error) {
      console.error('Failed to save summary:', error);
      toast.error('Failed to save summary as note');
    } finally {
      setSavingStates(prev => ({ ...prev, [saveKey]: false }));
    }
  };

  const handleSaveStudyQuestion = async (question: any, index: number) => {
    const saveKey = `study-question-${index}`;
    setSavingStates(prev => ({ ...prev, [saveKey]: true }));
    
    try {
      const questionTitle = `Study Question ${index + 1}: ${sourceTitle || 'AI Generated'}`;
      let noteContent = `<h2>Study Question</h2>\n<p><strong>Type:</strong> ${question.type || 'general'}</p>\n<p><strong>Question:</strong> ${question.question}</p>`;
      
      if (question.answer) {
        noteContent += `\n<h3>Answer</h3>\n<p>${question.answer}</p>`;
      }
      
      createNote({
        title: questionTitle,
        content: noteContent,
        category: 'AI Generated',
        tags: ['study-question', 'ai-enhanced'],
        skipContentCheck: true
      });
      
      toast.success('Study question saved as new note');
    } catch (error) {
      console.error('Failed to save study question:', error);
      toast.error('Failed to save study question as note');
    } finally {
      setSavingStates(prev => ({ ...prev, [saveKey]: false }));
    }
  };

  const handleSaveAllReviewQuestions = async (reviewQuestions: any[]) => {
    const saveKey = 'all-review-questions';
    setSavingStates(prev => ({ ...prev, [saveKey]: true }));
    
    try {
      const questionsTitle = `Review Questions: ${sourceTitle || 'AI Generated'}`;
      let noteContent = `<h1>Review Questions</h1>\n`;
      
      reviewQuestions.forEach((q: any, index: number) => {
        const question = typeof q === 'object' ? q.question : q;
        const answer = typeof q === 'object' ? q.answer : 'Answer not provided';
        
        noteContent += `<div style="margin-bottom: 20px;">`;
        noteContent += `<h3>Question ${index + 1}</h3>`;
        noteContent += `<p><strong>Q:</strong> ${question}</p>`;
        noteContent += `<p><strong>A:</strong> ${answer}</p>`;
        noteContent += `</div>`;
      });

      createNote({
        title: questionsTitle,
        content: noteContent,
        category: 'AI Generated',
        tags: ['review-questions', 'ai-enhanced'],
        skipContentCheck: true
      });
      
      toast.success('Review questions saved as new note');
    } catch (error) {
      console.error('Failed to save review questions:', error);
      toast.error('Failed to save review questions as note');
    } finally {
      setSavingStates(prev => ({ ...prev, [saveKey]: false }));
    }
  };

  // Debug logging
  console.log('EnhancementDisplay received:', { enhancement, type });
  
  if (!enhancement) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <AlertTriangle className="h-4 w-4 mr-2" />
        No enhancement data available
      </div>
    );
  }

  // Extract and parse content using universal parser
  const rawContent = extractContentFromResponse(enhancement);
  const parsedResponse = parseAIResponse(rawContent);
  
  let content;
  if (parsedResponse.success) {
    content = parsedResponse.data;
  } else {
    // Fallback to direct content if parsing fails
    content = enhancement.content || enhancement;
    console.warn('Failed to parse enhancement content:', parsedResponse.error);
  }
  
  console.log('Processed content:', content);

  switch (type) {
    case 'summary':
      return (
        <div className="space-y-4">
          {content.summary && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Summary</h3>
                <AnimatedSaveButton
                  onClick={() => handleSaveSummary(content)}
                  disabled={savingStates['summary'] || isCreating}
                  title="Save summary as note"
                  uniqueId="summary-save"
                />
              </div>
              <p className="text-sm text-muted-foreground">{content.summary}</p>
            </div>
          )}
          {content.keyTakeaways && content.keyTakeaways.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Key Takeaways</h3>
              <ul className="space-y-1">
                {content.keyTakeaways.map((takeaway: string, index: number) => (
                  <li key={index} className="text-sm flex items-start gap-2">
                    <Star className="h-3 w-3 mt-1 text-yellow-500 flex-shrink-0" />
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {content.wordCount && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Original: {content.wordCount.original} words | Summary: {content.wordCount.summary} words
            </div>
          )}
          {/* Fallback: show raw content if expected structure not found */}
          {!content.summary && !content.keyTakeaways && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Generated content:</p>
              <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap">
                {typeof content === 'object' ? JSON.stringify(content, null, 2) : content}
              </pre>
            </div>
          )}
        </div>
      );

    case 'key_points':
      return (
        <div className="space-y-4">
          {content.keyPoints && content.keyPoints.length > 0 ? (
            content.keyPoints.map((point: any, index: number) => {
              const pointKey = `keypoint-${index}`;
              return (
                <Card key={`${point.point}-${index}`} className="relative">
                  <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{point.point}</CardTitle>
                        </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyKeyPoint(point)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AnimatedSaveButton
                          onClick={() => handleSaveKeyPoint(point, index)}
                          disabled={savingStates[pointKey] || isCreating}
                          title="Save key point as note"
                          uniqueId={`keypoint-${index}-save`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  {point.details && point.details.length > 0 && (
                    <CardContent className="pt-0">
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {point.details.map((detail: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              );
            })
          ) : (
            /* Fallback: show raw content if keyPoints not found */
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Generated content:</p>
              <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap">
                {typeof content === 'object' ? JSON.stringify(content, null, 2) : content}
              </pre>
            </div>
          )}
          {content.categories && content.categories.length > 0 && (
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium mb-2">Categories</h4>
              <div className="flex flex-wrap gap-1">
                {content.categories.map((category: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'questions':
      return (
        <div className="space-y-4">
          {content.studyQuestions && content.studyQuestions.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Study Questions</h3>
              <div className="space-y-3">
                {content.studyQuestions.map((q: any, index: number) => {
                  const questionId = `study-${index}`;
                  const saveKey = `study-question-${index}`;
                  const isOpen = openAnswers[questionId];
                  
                  return (
                    <div key={`${q.question}-${index}`} className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{q.type || 'general'}</Badge>
                            {q.difficulty && (
                              <Badge variant="secondary" className="text-xs">
                                {q.difficulty}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Collapsible open={isOpen} onOpenChange={() => toggleAnswer(questionId)}>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Show/Hide Answer"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </CollapsibleTrigger>
                            </Collapsible>
                            <AnimatedSaveButton
                              onClick={() => handleSaveStudyQuestion(q, index)}
                              disabled={savingStates[saveKey] || isCreating}
                              title="Save study question as note"
                              uniqueId={`study-question-${index}-save`}
                            />
                          </div>
                        </div>
                        <p className="text-sm font-medium">{q.question}</p>
                        
                        <Collapsible open={isOpen} onOpenChange={() => toggleAnswer(questionId)}>
                          <CollapsibleContent className="mt-3">
                            <div className="p-3 bg-background rounded border-l-4 border-l-primary">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium text-primary">ANSWER</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{q.answer}</p>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {content.reviewQuestions && content.reviewQuestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Quick Review Questions</h3>
                <AnimatedSaveButton
                  onClick={() => handleSaveAllReviewQuestions(content.reviewQuestions)}
                  disabled={savingStates['all-review-questions'] || isCreating}
                  title="Save all review questions as note"
                  uniqueId="all-review-questions-save"
                />
              </div>
              <div className="space-y-2">
                {content.reviewQuestions.map((q: any, index: number) => {
                  const questionId = `review-${index}`;
                  const isOpen = openAnswers[questionId];
                  const question = typeof q === 'object' ? q.question : q;
                  const answer = typeof q === 'object' ? q.answer : 'Answer not provided';
                  
                  return (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="p-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium flex-1">{question}</p>
                          <Collapsible open={isOpen} onOpenChange={() => toggleAnswer(questionId)}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 ml-2"
                                title="Show/Hide Answer"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        </div>
                        
                        <Collapsible open={isOpen} onOpenChange={() => toggleAnswer(questionId)}>
                          <CollapsibleContent className="mt-2">
                            <div className="p-2 bg-background rounded border-l-4 border-l-primary">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-primary">ANSWER</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{answer}</p>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Fallback: show raw content if no questions found */}
          {(!content.studyQuestions || content.studyQuestions.length === 0) && 
           (!content.reviewQuestions || content.reviewQuestions.length === 0) && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Generated content:</p>
              <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap">
                {typeof content === 'object' ? JSON.stringify(content, null, 2) : content}
              </pre>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          {typeof content === 'object' ? (
            <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto whitespace-pre-wrap">
              {JSON.stringify(content, null, 2)}
            </pre>
          ) : (
            <p className="text-sm">{content}</p>
          )}
        </div>
      );
  }
}
