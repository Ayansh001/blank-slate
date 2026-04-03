
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export function AIAnalyticsPanel() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['ai-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get quiz performance analytics
      const { data: quizData } = await supabase
        .from('quiz_sessions')
        .select('score, quiz_type, time_spent_minutes, completed_at')
        .eq('user_id', user.id)
        .eq('completed', true);

      // Get chat usage analytics  
      const { data: chatData } = await supabase
        .from('ai_chat_sessions')
        .select('total_messages, session_type, created_at')
        .eq('user_id', user.id);

      // Get enhancement analytics
      const { data: enhancementData } = await supabase
        .from('note_enhancements')
        .select('enhancement_type, is_applied, created_at')
        .eq('user_id', user.id);

      return {
        quizzes: quizData || [],
        chats: chatData || [],
        enhancements: enhancementData || []
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Usage Analytics</CardTitle>
          <CardDescription>Insights into your AI feature usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg border">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            AI Usage Analytics
          </CardTitle>
          <CardDescription>Insights into your AI feature usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
            <p className="text-muted-foreground">
              Use AI features to see usage analytics here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgQuizScore = analytics.quizzes.length > 0 
    ? analytics.quizzes.reduce((sum, q) => sum + q.score, 0) / analytics.quizzes.length
    : 0;

  const totalMessages = analytics.chats.reduce((sum, c) => sum + (c.total_messages || 0), 0);
  const appliedEnhancements = analytics.enhancements.filter(e => e.is_applied).length;
  const avgTimeSpent = analytics.quizzes.length > 0
    ? analytics.quizzes.reduce((sum, q) => sum + (q.time_spent_minutes || 0), 0) / analytics.quizzes.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          AI Usage Analytics
        </CardTitle>
        <CardDescription>Insights into your AI feature usage patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Quiz Performance
            </div>
            <div className="text-2xl font-bold">{avgQuizScore.toFixed(1)}%</div>
            <Badge variant="secondary" className="text-xs">
              Average Score
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              Chat Activity  
            </div>
            <div className="text-2xl font-bold">{totalMessages}</div>
            <Badge variant="secondary" className="text-xs">
              Total Messages
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Study Time
            </div>
            <div className="text-2xl font-bold">{avgTimeSpent.toFixed(1)}m</div>
            <Badge variant="secondary" className="text-xs">
              Avg per Quiz
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Enhancements
            </div>
            <div className="text-2xl font-bold">{appliedEnhancements}</div>
            <Badge variant="secondary" className="text-xs">
              Applied
            </Badge>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium mb-3">Feature Usage Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Quizzes Completed</span>
              <span className="font-medium">{analytics.quizzes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Chat Sessions</span>
              <span className="font-medium">{analytics.chats.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Notes Enhanced</span>
              <span className="font-medium">{analytics.enhancements.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
