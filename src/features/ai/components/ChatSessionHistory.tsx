
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, Trash2, Calendar, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { format, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { HistoryRecordPreviewDialog } from './HistoryRecordPreviewDialog';
import { EnhancedDeleteDialog } from './EnhancedDeleteDialog';
import { useHistoryFilters } from '../contexts/HistoryFilterContext';
import { useFilteredData } from '../hooks/useFilteredData';

interface ChatSession {
  id: string;
  user_id: string;
  session_name: string;
  total_messages: number;
  updated_at: string | null;
  created_at: string | null;
}

export function ChatSessionHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { filters } = useHistoryFilters();
  const [previewRecord, setPreviewRecord] = useState<ChatSession | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ChatSession | null>(null);

  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['chat-history', user?.id],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from('ai_chat_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false, nullsFirst: false });

        if (error) {
          console.warn('Chat sessions table not available:', error.message);
          return [];
        }

        // Filter sessions with actual messages
        const sessions = (data as ChatSession[]) || [];
        if (sessions.length === 0) return [];

        const sessionIds = sessions.map(s => s.id);
        const { data: messageRows, error: msgErr } = await supabase
          .from('ai_chat_messages')
          .select('session_id')
          .eq('user_id', user.id)
          .in('session_id', sessionIds);

        if (msgErr) return [];

        const messageCountMap = new Map<string, number>();
        (messageRows || []).forEach((row: any) => {
          const prev = messageCountMap.get(row.session_id) || 0;
          messageCountMap.set(row.session_id, prev + 1);
        });

        return sessions
          .map(session => ({ 
            ...session, 
            actual_message_count: messageCountMap.get(session.id) || 0 
          }))
          .filter(session => session.actual_message_count > 0);
      } catch (error) {
        console.warn('Error fetching chat history:', error);
        return [];
      }
    },
    enabled: !!user
  });

  // Apply filters to chat data
  const sessions = useFilteredData(
    allSessions,
    filters,
    () => 'chat',
    () => 'active',
    (session) => session.updated_at || session.created_at,
    (session) => session.session_name || 'Untitled Session'
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
      toast.success('Chat session deleted successfully');
      setDeleteRecord(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete chat session: ' + error.message);
    }
  });

  const getDisplayDate = (session: ChatSession): string => {
    const date = session.updated_at || session.created_at;
    
    if (!date) {
      return 'Unknown date';
    }

    try {
      const parsedDate = new Date(date);
      if (!isValid(parsedDate)) {
        console.warn('Invalid date encountered in chat history:', date);
        return 'Invalid date';
      }
      return format(parsedDate, 'MMM d, yyyy HH:mm');
    } catch (error) {
      console.warn('Date formatting error for chat:', date, error);
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat History
          </CardTitle>
          <CardDescription>Your AI conversation sessions</CardDescription>
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

  if (!sessions.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat History
            {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? (
              <Badge variant="secondary" className="ml-2">
                No matches
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>Your AI conversation sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? 
                'No matching chat sessions found' : 
                'No Chat History Yet'
              }
            </h3>
            <p className="text-muted-foreground">
              {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? 
                'Try adjusting your filters to see more results' :
                'Start a conversation with AI to see your chat history here'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat History
            {filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm ? (
              <Badge variant="secondary" className="ml-2">
                {sessions.length} filtered
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>Your AI conversation sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session: any) => (
              <div
                key={session.id}
                className="group relative p-4 rounded-lg border hover:shadow-md transition-all duration-200"
              >
                {/* Hover Actions */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewRecord(session);
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
                      setDeleteRecord(session);
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>

                <div className="flex items-start justify-between pr-20">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-purple-500" />
                      <h3 className="font-medium">
                        {session.session_name || 'Untitled Session'}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {session.actual_message_count || session.total_messages || 0} messages
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {getDisplayDate(session)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <HistoryRecordPreviewDialog
        open={!!previewRecord}
        onOpenChange={() => setPreviewRecord(null)}
        record={previewRecord}
        recordType="chat"
        onDelete={(id) => {
          setPreviewRecord(null);
          const recordToDelete = sessions.find(s => s.id === id);
          if (recordToDelete) setDeleteRecord(recordToDelete);
        }}
        onExport={(id) => {
          const sessionToExport = sessions.find(s => s.id === id);
          if (sessionToExport) {
            const dataStr = JSON.stringify([sessionToExport], null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            const exportFileDefaultName = `chat-${sessionToExport.session_name || 'session'}-${format(new Date(), 'yyyy-MM-dd')}.json`;
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toast.success('Chat session exported successfully');
          }
        }}
      />

      {/* Enhanced Delete Dialog */}
      <EnhancedDeleteDialog
        open={!!deleteRecord}
        onOpenChange={() => setDeleteRecord(null)}
        record={deleteRecord}
        recordType="chat"
        onConfirm={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
