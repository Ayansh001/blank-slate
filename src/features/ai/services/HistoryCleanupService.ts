import { supabase } from '@/integrations/supabase/client';

interface CleanupOptions {
  olderThanDays?: number;
  includeOrphanedRecords?: boolean;
}

interface CleanupResult {
  success: boolean;
  deletedCount: number;
  errors: string[];
}

export class HistoryCleanupService {
  static async cleanupQuizSessions(
    userId: string,
    options: CleanupOptions = {}
  ): Promise<CleanupResult> {
    const { olderThanDays = 30, includeOrphanedRecords = false } = options;
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Build base query
      let query = supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId);

      // Add date filter
      query = query.lt('completed_at', cutoffDate.toISOString());

      // Execute query
      const { data: oldQuizzes, error: fetchError } = await query;

      if (fetchError) {
        errors.push(`Failed to fetch old quizzes: ${fetchError.message}`);
        return { success: false, deletedCount: 0, errors };
      }

      if (!oldQuizzes || oldQuizzes.length === 0) {
        return { success: true, deletedCount: 0, errors: [] };
      }

      // Process quizzes
      const quizzesToDelete = oldQuizzes.filter((quiz: any) => {
        if (!quiz || !quiz.completed_at) {
          return false;
        }

        try {
          const completedAt = new Date(quiz.completed_at);
          return completedAt < cutoffDate;
        } catch (error) {
          console.warn('Invalid date in quiz:', quiz.id, quiz.completed_at);
          return false;
        }
      });

      if (quizzesToDelete.length === 0) {
        return { success: true, deletedCount: 0, errors: [] };
      }

      // Delete old quizzes
      const quizIds = quizzesToDelete.map((q: any) => q.id);
      const { error: deleteError } = await supabase
        .from('quiz_sessions')
        .delete()
        .eq('user_id', userId)
        .in('id', quizIds);

      if (deleteError) {
        errors.push(`Failed to delete quizzes: ${deleteError.message}`);
        return { success: false, deletedCount: 0, errors };
      }

      deletedCount = quizIds.length;

      return {
        success: errors.length === 0,
        deletedCount,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      errors.push(`Cleanup failed: ${errorMessage}`);
      return { success: false, deletedCount: 0, errors };
    }
  }

  static async cleanupChatSessions(
    userId: string,
    options: CleanupOptions = {}
  ): Promise<CleanupResult> {
    const { olderThanDays = 30, includeOrphanedRecords = false } = options;
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Build base query
      let query = supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', userId);

      // Add date filter
      query = query.lt('updated_at', cutoffDate.toISOString());

      // Execute query
      const { data: oldSessions, error: fetchError } = await query;

      if (fetchError) {
        errors.push(`Failed to fetch old chat sessions: ${fetchError.message}`);
        return { success: false, deletedCount: 0, errors };
      }

      if (!oldSessions || oldSessions.length === 0) {
        return { success: true, deletedCount: 0, errors: [] };
      }

      // Process sessions
      const sessionsToDelete = oldSessions.filter((session: any) => {
        if (!session || !session.updated_at) {
          return false;
        }

        try {
          const updatedAt = new Date(session.updated_at);
          return updatedAt < cutoffDate;
        } catch (error) {
          console.warn('Invalid date in chat session:', session.id, session.updated_at);
          return false;
        }
      });

      if (sessionsToDelete.length === 0) {
        return { success: true, deletedCount: 0, errors: [] };
      }

      // Delete old sessions
      const sessionIds = sessionsToDelete.map((s: any) => s.id);
      const { error: deleteError } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('user_id', userId)
        .in('id', sessionIds);

      if (deleteError) {
        errors.push(`Failed to delete chat sessions: ${deleteError.message}`);
        return { success: false, deletedCount: 0, errors };
      }

      deletedCount = sessionIds.length;

      return {
        success: errors.length === 0,
        deletedCount,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      errors.push(`Cleanup failed: ${errorMessage}`);
      return { success: false, deletedCount: 0, errors };
    }
  }

  static async cleanupNoteEnhancements(
    userId: string,
    options: CleanupOptions = {}
  ): Promise<CleanupResult> {
    const { olderThanDays = 30, includeOrphanedRecords = false } = options;
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Build base query
      let query = supabase
        .from('note_enhancements')
        .select('*')
        .eq('user_id', userId);

      // Add date filter
      query = query.lt('created_at', cutoffDate.toISOString());

      // Execute query with proper error handling
      const { data: oldEnhancements, error: fetchError } = await query;

      if (fetchError) {
        errors.push(`Failed to fetch old enhancements: ${fetchError.message}`);
        return { success: false, deletedCount: 0, errors };
      }

      if (!oldEnhancements || oldEnhancements.length === 0) {
        return { success: true, deletedCount: 0, errors: [] };
      }

      // Process enhancements with proper type checking
      const enhancementsToDelete = oldEnhancements.filter((enhancement: any) => {
        // Ensure we have a valid created_at date
        if (!enhancement || !enhancement.created_at) {
          return false;
        }

        try {
          const createdAt = new Date(enhancement.created_at);
          return createdAt < cutoffDate;
        } catch (error) {
          console.warn('Invalid date in enhancement:', enhancement.id, enhancement.created_at);
          return false;
        }
      });

      if (enhancementsToDelete.length === 0) {
        return { success: true, deletedCount: 0, errors: [] };
      }

      // Delete old enhancements
      const enhancementIds = enhancementsToDelete.map((e: any) => e.id);
      const { error: deleteError } = await supabase
        .from('note_enhancements')
        .delete()
        .eq('user_id', userId)
        .in('id', enhancementIds);

      if (deleteError) {
        errors.push(`Failed to delete enhancements: ${deleteError.message}`);
        return { success: false, deletedCount: 0, errors };
      }

      deletedCount = enhancementIds.length;

      // Handle orphaned records if requested
      if (includeOrphanedRecords) {
        try {
          const { data: orphanedEnhancements, error: orphanError } = await supabase
            .from('note_enhancements')
            .select('*')
            .eq('user_id', userId)
            .is('note_id', null)
            .is('file_id', null);

          if (!orphanError && orphanedEnhancements && orphanedEnhancements.length > 0) {
            const orphanedIds = orphanedEnhancements.map((e: any) => e.id);
            const { error: deleteOrphanError } = await supabase
              .from('note_enhancements')
              .delete()
              .eq('user_id', userId)
              .in('id', orphanedIds);

            if (!deleteOrphanError) {
              deletedCount += orphanedIds.length;
            } else {
              errors.push(`Failed to delete orphaned enhancements: ${deleteOrphanError.message}`);
            }
          }
        } catch (orphanCleanupError) {
          errors.push(`Error during orphan cleanup: ${orphanCleanupError}`);
        }
      }

      return {
        success: errors.length === 0,
        deletedCount,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      errors.push(`Cleanup failed: ${errorMessage}`);
      return { success: false, deletedCount: 0, errors };
    }
  }
}
