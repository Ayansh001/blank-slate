import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Brain, MessageCircle, FileText, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { EnhancedPieChart } from './EnhancedPieChart';

interface UsageStats {
  dailyActivity: Array<{ date: string; quizzes: number; chats: number; enhancements: number }>;
  featureUsage: Array<{ name: string; value: number; color: string }>;
  timeDistribution: Array<{ hour: number; activity: number }>;
  totalStats: {
    totalQuizzes: number;
    totalChats: number;
    totalEnhancements: number;
    avgQuizScore: number;
    totalMessages: number;
  };
}

export function UsageAnalyticsPanel() {
  const { user } = useAuth();

  const { data: usageStats, isLoading } = useQuery({
    queryKey: ['usage-analytics', user?.id],
    queryFn: async (): Promise<UsageStats> => {
      if (!user) throw new Error('No user');

      // Get last 7 days of data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      // Fetch quiz sessions
      const { data: quizSessions } = await supabase
        .from('quiz_sessions')
        .select('created_at, score')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgoISO);

      // Fetch chat sessions (need id to map messages reliably)
      const { data: chatSessions } = await supabase
        .from('ai_chat_sessions')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgoISO);

      // Fetch note enhancements
      const { data: enhancements } = await supabase
        .from('note_enhancements')
        .select('created_at, enhancement_type')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgoISO);

      // Compute actual message count from ai_chat_messages for the same 7-day window
      let totalMessages = 0;
      if (chatSessions && chatSessions.length > 0) {
        const sessionIds = chatSessions.map((s: any) => s.id);
        const { data: messageRows, error: msgErr } = await supabase
          .from('ai_chat_messages')
          .select('session_id, created_at')
          .eq('user_id', user.id)
          .in('session_id', sessionIds)
          .gte('created_at', sevenDaysAgoISO);

        if (!msgErr && Array.isArray(messageRows)) {
          totalMessages = messageRows.length;
          // Helpful debug info to ensure counts match expectations
          console.log('[UsageAnalyticsPanel] Message counting',
            { sessionsConsidered: sessionIds.length, totalMessages });
        } else {
          console.warn('[UsageAnalyticsPanel] Message fetch error or no rows; defaulting totalMessages=0', msgErr);
        }
      }

      // Process daily activity
      const dailyMap = new Map<string, { quizzes: number; chats: number; enhancements: number }>();
      
      // Initialize last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { quizzes: 0, chats: 0, enhancements: 0 });
      }

      // Count quiz sessions by day
      quizSessions?.forEach((session: any) => {
        const dateStr = session.created_at.split('T')[0];
        const entry = dailyMap.get(dateStr);
        if (entry) entry.quizzes++;
      });

      // Count chat sessions by day (per session basis)
      chatSessions?.forEach((session: any) => {
        const dateStr = session.created_at.split('T')[0];
        const entry = dailyMap.get(dateStr);
        if (entry) entry.chats++;
      });

      // Count enhancements by day
      enhancements?.forEach((enhancement: any) => {
        const dateStr = enhancement.created_at.split('T')[0];
        const entry = dailyMap.get(dateStr);
        if (entry) entry.enhancements++;
      });

      const dailyActivity = Array.from(dailyMap.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .reverse();

      // Feature usage distribution
      const totalQuizzes = quizSessions?.length || 0;
      const totalChats = chatSessions?.length || 0;
      const totalEnhancements = enhancements?.length || 0;

      const featureUsage = [
        { name: 'Quiz Sessions', value: totalQuizzes, color: '#3b82f6' },
        { name: 'Chat Sessions', value: totalChats, color: '#8b5cf6' },
        { name: 'Note Enhancements', value: totalEnhancements, color: '#10b981' }
      ].filter(item => item.value > 0);

      // Time distribution (by hour of day)
      const hourlyMap = new Map<number, number>();
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, 0);
      }

      [...(quizSessions || []), ...(chatSessions || []), ...(enhancements || [])]
        .forEach((item: any) => {
          const hour = new Date(item.created_at).getHours();
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
        });

      const timeDistribution = Array.from(hourlyMap.entries())
        .map(([hour, activity]) => ({ hour, activity }));

      // Calculate stats
      const avgQuizScore = quizSessions?.length > 0 
        ? (quizSessions as any[]).reduce((sum, s) => sum + (s.score || 0), 0) / quizSessions.length 
        : 0;

      return {
        dailyActivity,
        featureUsage,
        timeDistribution,
        totalStats: {
          totalQuizzes,
          totalChats,
          totalEnhancements,
          avgQuizScore,
          totalMessages
        }
      };
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageStats || usageStats.totalStats.totalQuizzes + usageStats.totalStats.totalChats + usageStats.totalStats.totalEnhancements === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
          <CardDescription>Insights into your AI feature usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Usage Data Yet</h3>
            <p className="text-muted-foreground">
              Start using AI features to see your usage patterns here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{usageStats.totalStats.totalQuizzes}</div>
                <div className="text-sm text-muted-foreground">Quiz Sessions</div>
                <Badge variant="secondary" className="mt-1">
                  {usageStats.totalStats.avgQuizScore.toFixed(0)}% avg
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{usageStats.totalStats.totalChats}</div>
                <div className="text-sm text-muted-foreground">Chat Sessions</div>
                <Badge variant="secondary" className="mt-1">
                  {usageStats.totalStats.totalMessages} messages
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{usageStats.totalStats.totalEnhancements}</div>
                <div className="text-sm text-muted-foreground">Enhancements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {usageStats.totalStats.totalQuizzes + usageStats.totalStats.totalChats + usageStats.totalStats.totalEnhancements}
                </div>
                <div className="text-sm text-muted-foreground">Total Activities</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity (Last 7 Days)</CardTitle>
          <CardDescription>Your AI feature usage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageStats.dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quizzes" fill="#3b82f6" name="Quizzes" />
              <Bar dataKey="chats" fill="#8b5cf6" name="Chats" />
              <Bar dataKey="enhancements" fill="#10b981" name="Enhancements" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Distribution */}
        {usageStats.featureUsage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage Distribution</CardTitle>
              <CardDescription>How you use different AI features</CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedPieChart data={usageStats.featureUsage} />
            </CardContent>
          </Card>
        )}

        {/* Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity by Time of Day
            </CardTitle>
            <CardDescription>When you're most active with AI features</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={usageStats.timeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip labelFormatter={(value) => `${value}:00`} />
                <Line type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
