import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Eye, Trash2, Calendar, Clock, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { format, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { HistoryRecordPreviewDialog } from './HistoryRecordPreviewDialog';
import { EnhancedDeleteDialog } from './EnhancedDeleteDialog';
import { QuizErrorBoundary } from './QuizErrorBoundary';
import { QuizDataNormalizer } from '../utils/quizDataNormalizer';
import { useHistoryFilters } from '../contexts/HistoryFilterContext';
import { useFilteredData } from '../hooks/useFilteredData';

interface QuizSession {
  id: string;
  user_id: string;
  quiz_type: string;
  score: number;
  time_spent_minutes: number;
  ai_service: string;
  questions: any;
  answers: any;
  completed: boolean;
  completed_at: string | null;
  created_at: string | null;
}

export function EnhancedQuizHistoryList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { filters } = useHistoryFilters();
  const [previewRecord, setPreviewRecord] = useState<QuizSession | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<QuizSession | null>(null);

  const { data: allQuizzes = [], isLoading, refetch } = useQuery({
    queryKey: ['quiz-history-enhanced', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('completed_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false });

        if (error) {
          console.warn('Quiz sessions table not available:', error.message);
          return [];
        }
        return data as QuizSession[] || [];
      } catch (error) {
        console.warn('Error fetching quiz history:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // Apply filters to quiz data
  const quizzes = useFilteredData(
    allQuizzes,
    filters,
    (quiz) => 'quiz',
    (quiz) => 'completed',
    (quiz) => quiz.completed_at || quiz.created_at,
    (quiz) => `${quiz.quiz_type} ${quiz.ai_service}`
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('quiz_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-history-enhanced'] });
      toast.success('Quiz session deleted successfully');
      setDeleteRecord(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete quiz session: ' + error.message);
    }
  });

  const getQuestionCount = (questions: any): number => {
    try {
      const normalizedData = QuizDataNormalizer.normalizeQuizData({ questions });
      return normalizedData?.questions.length || 0;
    } catch (error) {
      console.warn('Error getting question count:', error);
      // Fallback: try to extract question count from various data structures
      if (questions?.questions && Array.isArray(questions.questions)) {
        return questions.questions.length;
      }
      if (Array.isArray(questions)) {
        return questions.length;
      }
      return 0;
    }
  };

  const getDisplayDate = (quiz: QuizSession): string => {
    const date = quiz.completed_at || quiz.created_at;
    
    if (!date) {
      return 'Unknown date';
    }

    try {
      const parsedDate = new Date(date);
      if (!isValid(parsedDate)) {
        console.warn('Invalid date encountered in quiz history:', date);
        return 'Invalid date';
      }
      return format(parsedDate, 'MMM d, yyyy HH:mm');
    } catch (error) {
      console.warn('Date formatting error for quiz:', date, error);
      return 'Invalid date';
    }
  };

  const getScoreLevel = (score: number): { variant: 'default' | 'secondary' | 'destructive'; label: string } => {
    if (score >= 80) return { variant: 'default', label: 'Excellent' };
    if (score >= 60) return { variant: 'secondary', label: 'Good' };
    return { variant: 'destructive', label: 'Needs Improvement' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quiz History
          </CardTitle>
          <CardDescription>Your completed AI-generated quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quizzes.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quiz History
          </CardTitle>
          <CardDescription>Your completed AI-generated quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Quiz History Yet</h3>
            <p className="text-muted-foreground">
              Complete some quizzes to see your history here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <QuizErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quiz History
            {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? (
              <Badge variant="secondary" className="ml-2">
                {quizzes.length} filtered
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>Your completed AI-generated quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quizzes.map((quiz) => {
              const scoreLevel = getScoreLevel(quiz.score);
              
              return (
                <div
                  key={quiz.id}
                  className="group relative p-4 rounded-lg border hover:shadow-md transition-all duration-200"
                >
                  {/* Hover Actions - Integrated into card like notes */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewRecord(quiz);
                      }}
                      className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteRecord(quiz);
                      }}
                      className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>

                  <div className="flex items-start justify-between pr-20">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-500" />
                        <h3 className="font-medium">
                          Quiz: {quiz.quiz_type.replace('_', ' ')}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Score: {quiz.score}%
                        </div>
                        <div className="flex items-center gap-1">
                          <Brain className="h-3 w-3" />
                          {getQuestionCount(quiz.questions)} questions
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {quiz.time_spent_minutes || 0} min
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getDisplayDate(quiz)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{quiz.ai_service}</Badge>
                        <Badge variant={scoreLevel.variant}>
                          {scoreLevel.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <HistoryRecordPreviewDialog
        open={!!previewRecord}
        onOpenChange={() => setPreviewRecord(null)}
        record={previewRecord}
        recordType="quiz"
        onDelete={(id) => {
          setPreviewRecord(null);
          const recordToDelete = quizzes.find(q => q.id === id);
          if (recordToDelete) setDeleteRecord(recordToDelete);
        }}
        onExport={(id) => {
          const quizToExport = quizzes.find(q => q.id === id);
          if (quizToExport) {
            const dataStr = JSON.stringify([quizToExport], null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const exportFileDefaultName = `quiz-${quizToExport.quiz_type}-${format(new Date(), 'yyyy-MM-dd')}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toast.success('Quiz exported successfully');
          }
        }}
      />

      {/* Enhanced Delete Dialog */}
      <EnhancedDeleteDialog
        open={!!deleteRecord}
        onOpenChange={() => setDeleteRecord(null)}
        record={deleteRecord}
        recordType="quiz"
        onConfirm={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    </QuizErrorBoundary>
  );
}
