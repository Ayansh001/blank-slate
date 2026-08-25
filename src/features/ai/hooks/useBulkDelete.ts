
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';

export function useBulkDelete() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ category, userId }: { category: string; userId: string }) => {
      let deletedCount = 0;

      switch (category) {
        case 'quiz_sessions':
          const { error: quizError } = await supabase
            .from('quiz_sessions')
            .delete()
            .eq('user_id', userId);
          if (quizError) throw new Error(`Failed to delete quiz sessions: ${quizError.message}`);
          break;

        case 'chat_sessions':
          // First get all session IDs for this user
          const { data: sessions, error: sessionsError } = await supabase
            .from('ai_chat_sessions')
            .select('id')
            .eq('user_id', userId);
          
          if (sessionsError) throw new Error(`Failed to fetch chat sessions: ${sessionsError.message}`);

          // Delete related chat messages first
          if (sessions && sessions.length > 0) {
            const sessionIds = sessions.map(session => session.id);
            const { error: messagesError } = await supabase
              .from('ai_chat_messages')
              .delete()
              .in('session_id', sessionIds);
            
            if (messagesError) throw new Error(`Failed to delete chat messages: ${messagesError.message}`);
          }

          // Then delete chat sessions
          const { error: chatError } = await supabase
            .from('ai_chat_sessions')
            .delete()
            .eq('user_id', userId);
          if (chatError) throw new Error(`Failed to delete chat sessions: ${chatError.message}`);
          break;

        case 'note_enhancements':
          const { error: enhancementError } = await supabase
            .from('note_enhancements')
            .delete()
            .eq('user_id', userId);
          if (enhancementError) throw new Error(`Failed to delete note enhancements: ${enhancementError.message}`);
          break;

        case 'concept_learning':
          const { error: conceptError } = await supabase
            .from('concept_learning_sessions')
            .delete()
            .eq('user_id', userId);
          if (conceptError) throw new Error(`Failed to delete concept learning sessions: ${conceptError.message}`);
          break;

        case 'document_analyses':
          const { error: docError } = await supabase
            .from('document_analyses')
            .delete()
            .eq('user_id', userId);
          if (docError) throw new Error(`Failed to delete document analyses: ${docError.message}`);
          break;

        default:
          throw new Error(`Unsupported category: ${category}`);
      }

      return { category, deletedCount };
    },
    onSuccess: ({ category }) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['ai-history-data'] });
      queryClient.invalidateQueries({ queryKey: ['database-storage'] });
      queryClient.invalidateQueries({ queryKey: ['ai-history-preferences'] });
      
      // Invalidate specific category queries
      if (category === 'quiz_sessions') {
        queryClient.invalidateQueries({ queryKey: ['quiz-history'] });
      } else if (category === 'chat_sessions') {
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      } else if (category === 'note_enhancements') {
        queryClient.invalidateQueries({ queryKey: ['note-enhancements'] });
      }

      toast.success(`${category.replace('_', ' ')} history deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    }
  });

  return {
    bulkDelete: (category: string) => {
      if (!user) {
        toast.error('User not authenticated');
        return;
      }
      
      return bulkDeleteMutation.mutate({ category, userId: user.id });
    },
    isDeleting: bulkDeleteMutation.isPending
  };
}
