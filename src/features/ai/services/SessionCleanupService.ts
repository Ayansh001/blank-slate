
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class SessionCleanupService {
  /**
   * Clean up empty sessions that have no messages (conservative approach)
   */
  static async cleanupEmptySessions(userId: string): Promise<number> {
    try {
      console.debug('SessionCleanupService: Starting cleanup for user:', userId);

      // First, get all session IDs that actually have messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('ai_chat_messages')
        .select('session_id')
        .eq('user_id', userId);

      if (messagesError) {
        console.error('Error fetching message session IDs:', messagesError);
        return 0;
      }

      const sessionIdsWithMessages = new Set(
        (messagesData || []).map(msg => msg.session_id)
      );

      console.debug('SessionCleanupService: Found sessions with messages:', sessionIdsWithMessages.size);

      // Find sessions that are candidates for deletion
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: emptySessions, error: selectError } = await supabase
        .from('ai_chat_sessions')
        .select('id, total_messages, created_at')
        .eq('user_id', userId)
        .or('total_messages.eq.0,total_messages.is.null')
        .lt('created_at', fiveMinutesAgo);

      if (selectError) {
        console.error('Error finding empty sessions:', selectError);
        return 0;
      }

      if (!emptySessions || emptySessions.length === 0) {
        console.debug('SessionCleanupService: No sessions to clean');
        return 0;
      }

      // Only delete sessions that:
      // 1. Have total_messages = 0 or null
      // 2. Are NOT in the set of sessions with actual messages
      // 3. Are older than 5 minutes
      const sessionsToDelete = emptySessions.filter(session => {
        const hasMessages = sessionIdsWithMessages.has(session.id);
        return !hasMessages;
      });

      if (sessionsToDelete.length === 0) {
        console.debug('SessionCleanupService: No sessions safe to delete');
        return 0;
      }

      // Delete safe sessions
      const sessionIds = sessionsToDelete.map(s => s.id);
      const { error: deleteError } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .in('id', sessionIds)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting empty sessions:', deleteError);
        return 0;
      }

      console.log(`SessionCleanupService: Cleaned up ${sessionsToDelete.length} truly empty sessions`);
      return sessionsToDelete.length;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Mark a session as used when first message is sent
   */
  static async markSessionAsUsed(sessionId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('ai_chat_sessions')
        .update({ 
          updated_at: new Date().toISOString(),
          total_messages: 1
        })
        .eq('id', sessionId)
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error marking session as used:', error);
    }
  }

  /**
   * Check if a session has any messages
   */
  static async hasMessages(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1);

      if (error) {
        console.error('Error checking session messages:', error);
        return false;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking session messages:', error);
      return false;
    }
  }
}
