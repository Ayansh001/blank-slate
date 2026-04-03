import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '../utils/DebugLogger';

/**
 * Hook to enable real-time synchronization of AI history data
 * Listens for changes in quiz_sessions, note_enhancements, and ai_chat_sessions
 */
export function useAIHistorySync(onDataChange?: () => void) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Create channels for real-time updates
    const quizChannel = supabase
      .channel('quiz-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('useAIHistorySync', 'Quiz session change detected', payload);
          if (payload.eventType === 'INSERT') {
            toast.success('New quiz completed!');
          }
          onDataChange?.();
        }
      )
      .subscribe();

    const enhancementChannel = supabase
      .channel('note-enhancements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_enhancements',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('useAIHistorySync', 'Note enhancement change detected', payload);
          if (payload.eventType === 'INSERT') {
            toast.success('Note enhancement saved!');
          }
          onDataChange?.();
        }
      )
      .subscribe();

    const chatChannel = supabase
      .channel('chat-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_chat_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          logger.info('useAIHistorySync', 'Chat session change detected', payload);
          onDataChange?.();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      quizChannel.unsubscribe();
      enhancementChannel.unsubscribe();
      chatChannel.unsubscribe();
    };
  }, [user, onDataChange]);

  return {
    // Could return subscription status or other utilities if needed
  };
}