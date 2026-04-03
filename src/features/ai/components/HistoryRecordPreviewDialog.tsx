import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Download, Trash2, Calendar, User, FileText, MessageSquare, Brain, BookOpen } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ContentParser } from '../utils/contentParser';
import { EnhancementContentParser } from '../utils/enhancementContentParser';
import { ExpandableContent } from '@/components/ui/expandable-content';
import { EnhancementDisplay } from '@/components/ai/EnhancementDisplay';
import { ChatMessage } from './ChatMessage';
import { AIServiceProvider } from '../types';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuizDataNormalizer } from '../utils/quizDataNormalizer';
import { AnswerNormalizer } from '../utils/answerNormalization';

interface HistoryRecordPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any;
  recordType: 'quiz' | 'enhancement' | 'chat';
  onDelete?: (id: string) => void;
  onExport?: (id: string) => void;
  singleEnhancementOnly?: boolean;
}

export function HistoryRecordPreviewDialog({
  open,
  onOpenChange,
  record,
  recordType,
  onDelete,
  onExport,
  singleEnhancementOnly = false
}: HistoryRecordPreviewDialogProps) {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [allEnhancements, setAllEnhancements] = useState<any[]>([]);

  // Helper function to normalize AI service name to AIServiceProvider type
  const toProvider = (aiService: string | null | undefined): AIServiceProvider => {
    if (!aiService) return 'openai';
    
    const normalized = aiService.toLowerCase();
    if (normalized === 'openai' || normalized === 'anthropic' || normalized === 'gemini') {
      return normalized as AIServiceProvider;
    }
    
    // Handle potential variations or legacy formats
    if (normalized.includes('openai') || normalized.includes('gpt')) return 'openai';
    if (normalized.includes('anthropic') || normalized.includes('claude')) return 'anthropic';
    if (normalized.includes('gemini') || normalized.includes('google')) return 'gemini';
    
    return 'openai'; // Default fallback
  };

  useEffect(() => {
    if (open && recordType === 'chat' && record?.id) {
      fetchChatMessages(record.id);
    } else {
      setChatMessages([]);
      setLoadingMessages(false);
    }
  }, [open, recordType, record?.id]);

  useEffect(() => {
    if (open && recordType === 'enhancement' && !singleEnhancementOnly) {
      // Priority: fetch by session_id if available, fallback to note_id for legacy data
      if (record?.session_id) {
        fetchAllEnhancementsForSession(record.session_id);
      } else if (record?.note_id) {
        fetchAllEnhancementsForNote(record.note_id);
      } else {
        // For legacy file enhancements without session_id, show single record
        setAllEnhancements([]);
      }
    } else {
      setAllEnhancements([]);
    }
  }, [open, recordType, record?.session_id, record?.note_id, singleEnhancementOnly]);

  useEffect(() => {
    if (record) {
      validateRecordData(record, recordType);
    }
  }, [record, recordType]);

  const fetchAllEnhancementsForSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('note_enhancements')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .returns<any[]>();

      if (error) {
        console.error('Error fetching all enhancements for session:', error);
        setDataError(`Failed to load session enhancements: ${error.message}`);
        setAllEnhancements([]);
      } else {
        setAllEnhancements(data || []);
      }
    } catch (error) {
      console.error('Error fetching all enhancements for session:', error);
      setDataError('Failed to load session enhancements');
      setAllEnhancements([]);
    }
  };

  const fetchAllEnhancementsForNote = async (noteId: string) => {
    try {
      const { data, error } = await supabase
        .from('note_enhancements')
        .select('*')
        .eq('note_id', noteId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all enhancements for note:', error);
        setDataError(`Failed to load all enhancements: ${error.message}`);
        setAllEnhancements([]);
      } else {
        setAllEnhancements(data || []);
      }
    } catch (error) {
      console.error('Error fetching all enhancements for note:', error);
      setDataError('Failed to load all enhancements');
      setAllEnhancements([]);
    }
  };

  const validateRecordData = (data: any, type: string) => {
    setDataError(null);
    
    try {
      if (type === 'quiz') {
        if (!data.questions && !data.quiz_data) {
          setDataError('Quiz questions data is missing');
          return;
        }
        
        const normalized = QuizDataNormalizer.normalizeQuizData(data);
        if (!normalized || normalized.questions.length === 0) {
          setDataError('Quiz data could not be parsed properly');
          return;
        }
      } else if (type === 'enhancement') {
        if (!data.enhanced_content && !data.content && !data.enhancement && !data.result) {
          console.warn('Enhancement content may be missing or in unexpected format:', data);
        }
      }
    } catch (error) {
      console.error('Data validation error:', error);
      if (type !== 'enhancement') {
        setDataError(`Data validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const fetchChatMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    setDataError(null);
    
    try {
      console.debug('HistoryRecordPreviewDialog: Fetching ALL messages for session:', sessionId);
      
      // Fetch ALL messages (removed limit) for full conversation view
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching chat messages:', error);
        setDataError(`Failed to load chat messages: ${error.message}`);
        setChatMessages([]);
      } else {
        console.debug('HistoryRecordPreviewDialog: Loaded messages:', data?.length || 0);
        setChatMessages(data || []);
      }
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      setDataError('Failed to load chat messages');
      setChatMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const getRecordIcon = () => {
    switch (recordType) {
      case 'quiz': return Brain;
      case 'enhancement': return FileText;
      case 'chat': return MessageSquare;
      default: return BookOpen;
    }
  };

  const getDisplayDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM d, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  const renderQuizContent = () => {
    if (dataError) {
      return (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive font-medium">Data Error:</p>
          <p className="text-sm text-muted-foreground">{dataError}</p>
        </div>
      );
    }

    try {
      // Enhanced quiz data normalization using existing utilities
      const normalizedData = QuizDataNormalizer.normalizeQuizData(record);
      
      if (!normalizedData || normalizedData.questions.length === 0) {
        return (
          <div className="p-4 border rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">No quiz questions available to display.</p>
          </div>
        );
      }

      const { questions, userAnswers, score, timeSpent } = normalizedData;
      
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Score:</span>
              <div className="font-semibold text-lg">{score || record.score || 0}%</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Time Spent:</span>
              <div>{timeSpent || record.time_spent_minutes || 0} minutes</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Questions:</span>
              <div>{questions.length}</div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">AI Service:</span>
              <div className="capitalize">{record.ai_service || 'Unknown'}</div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Questions & Answers:</h4>
            {questions.map((question, index) => {
              const userAnswer = userAnswers[index] || 'Not answered';
              const correctAnswer = question.correct_answer || 'Unknown';
              
              // Use AnswerNormalizer for proper comparison
              let isCorrect = false;
              try {
                // Determine question type for proper normalization
                const questionType = question.options ? 'multiple_choice_extended' : 'open_ended';
                isCorrect = AnswerNormalizer.compareAnswers(userAnswer, correctAnswer, questionType as any);
              } catch (error) {
                // Fallback to simple comparison
                isCorrect = String(userAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim();
              }
              
              return (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="font-medium text-sm">
                    Q{index + 1}: {question.question}
                  </div>
                  
                  {question.options && (
                    <div className="text-xs text-muted-foreground pl-2">
                      Options: {question.options.join(', ')}
                    </div>
                  )}
                  
                  {userAnswer !== 'Not answered' && (
                    <div className="text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">Your answer:</span> 
                      <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {userAnswer} {isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-sm">
                    <span className="text-muted-foreground">Correct answer:</span> 
                    <span className="font-medium text-green-600">{correctAnswer}</span>
                  </div>
                  
                  {question.explanation && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering quiz content:', error);
      return (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive font-medium">Rendering Error:</p>
          <p className="text-sm text-muted-foreground">
            Unable to display quiz content. The data structure may be incompatible.
          </p>
        </div>
      );
    }
  };

  const renderEnhancementContent = () => {
    if (dataError) {
      return (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive font-medium">Data Error:</p>
          <p className="text-sm text-muted-foreground">{dataError}</p>
        </div>
      );
    }

    // For single enhancement preview, show only the selected record
    const enhancementsToShow = singleEnhancementOnly ? [record] : (allEnhancements.length > 0 ? allEnhancements : [record]);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">
              {record.note_id ? 'Note ID:' : 'File ID:'}
            </span>
            <div className="font-mono text-xs">
              {(record.note_id || record.file_id)?.slice(0, 16)}...
            </div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">
              {singleEnhancementOnly ? 'Enhancement Type:' : 'Session Enhancements:'}
            </span>
            <div>{singleEnhancementOnly ? (record.enhancement_type?.replace('_', ' ') || 'Unknown') : enhancementsToShow.length}</div>
          </div>
          {record.session_id && (
            <div className="col-span-2">
              <span className="font-medium text-muted-foreground">Session ID:</span>
              <div className="font-mono text-xs">{record.session_id}</div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h4 className="font-medium">
            {singleEnhancementOnly ? 'Enhancement Details:' : 
             (record.session_id ? 'All Enhancements in this Session:' : 'All Enhancements for this Note:')}
          </h4>
          
          {enhancementsToShow.map((enhancement, index) => {
            const parsedContent = EnhancementContentParser.parseEnhancementForDialog(enhancement);
            
            return (
              <div key={enhancement.id || index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {enhancement.enhancement_type?.replace('_', ' ') || 'Unknown'}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1.5">
                      <AIProviderLogo 
                        provider={toProvider(enhancement.ai_service)} 
                        size="sm" 
                      />
                      <span className="sr-only">
                        {enhancement.ai_service || 'Unknown'}
                      </span>
                    </Badge>
                    {enhancement.is_applied && (
                      <Badge variant="default">Applied</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {getDisplayDate(enhancement.created_at)}
                  </span>
                </div>

                <div className="border-t pt-3">
                  {parsedContent.success ? (
                    <EnhancementDisplay 
                      enhancement={parsedContent.data} 
                      type={enhancement.enhancement_type || 'unknown'} 
                    />
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-destructive">
                        Error parsing enhancement: {parsedContent.error}
                      </p>
                      <details className="text-xs">
                        <summary className="cursor-pointer">Show raw data</summary>
                        <pre className="mt-1 p-2 bg-muted rounded overflow-auto max-h-32">
                          {JSON.stringify(enhancement.enhanced_content, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChatContent = () => {
    if (dataError) {
      return (
        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <p className="text-sm text-destructive font-medium">Data Error:</p>
          <p className="text-sm text-muted-foreground">{dataError}</p>
        </div>
      );
    }

    // Calculate real message count from loaded messages
    const realMessageCount = chatMessages.length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Messages:</span>
            <div>{realMessageCount}</div>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">AI Service:</span>
            <div className="capitalize">{record.ai_service || 'Unknown'}</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium">Session Details:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Model:</span> {record.model_used || 'Unknown'}
            </div>
            {record.system_prompt && (
              <div>
                <span className="font-medium text-muted-foreground">System Prompt:</span>
                <ExpandableContent 
                  content={record.system_prompt}
                  maxLength={200}
                  className="mt-1 p-2 bg-muted rounded text-xs"
                />
              </div>
            )}
          </div>

          {chatMessages.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Complete Conversation:</h4>
              <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/20">
                {chatMessages.map((message, index) => (
                  <ChatMessage
                    key={message.id || index}
                    message={{
                      id: message.id || `msg-${index}`,
                      session_id: message.session_id,
                      user_id: message.user_id || record.user_id,
                      role: message.role,
                      content: message.content || 'No content',
                      created_at: message.created_at
                    }}
                    provider={toProvider(record.ai_service)}
                    showTimestamp={true}
                  />
                ))}
              </div>
            </div>
          )}

          {loadingMessages && (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground">Loading conversation...</div>
            </div>
          )}

          {!loadingMessages && chatMessages.length === 0 && !dataError && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No messages found for this chat session.
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!record) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>No Record Available</DialogTitle>
            <DialogDescription>
              The selected record could not be loaded.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const Icon = getRecordIcon();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {recordType === 'quiz' && `Quiz Session`}
            {recordType === 'enhancement' && (singleEnhancementOnly ? `Enhancement: ${record.enhancement_type?.replace('_', ' ') || 'Unknown'}` : `Note Enhancements`)}
            {recordType === 'chat' && (record.session_name || 'Chat Session')}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {getDisplayDate(record.completed_at || record.created_at)}
            </div>
            <Badge variant="outline" className="capitalize">
              {record.ai_service || 'Unknown'}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-4">
          {recordType === 'quiz' && renderQuizContent()}
          {recordType === 'enhancement' && renderEnhancementContent()}
          {recordType === 'chat' && renderChatContent()}
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={() => onExport(record.id)}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onDelete && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => onDelete(record.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
