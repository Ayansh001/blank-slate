
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../utils/DebugLogger';
import { toast } from 'sonner';
import { HistoryPreferenceService } from './HistoryPreferenceService';

export interface QuizHistoryEntry {
  user_id: string;
  file_id?: string;
  note_id?: string;
  quiz_type: string;
  questions: any;
  answers: any;
  score: number;
  time_spent_minutes: number;
  completed: boolean;
  ai_service: string;
  model_used: string;
  completed_at?: string;
}

export interface FileEnhancementHistoryEntry {
  user_id: string;
  file_id: string;
  enhancement_type: string;
  original_content: string;
  enhanced_content: any;
  ai_service: string;
  model_used: string;
  confidence_score?: number;
  session_id?: string;
}

/**
 * HistoryIntegrationService - Ensures quiz and file enhancement history is properly saved
 * without affecting the UI layer at all.
 */
export class HistoryIntegrationService {
  /**
   * Save quiz results to history - this runs completely in background
   * and never affects the UI or quiz generation process.
   */
  static async saveQuizToHistory(quizData: QuizHistoryEntry): Promise<void> {
    try {
      // Check if quiz history is enabled for this user
      const isEnabled = await HistoryPreferenceService.isEnabled(quizData.user_id, 'quiz_sessions');
      if (!isEnabled) {
        logger.info('HistoryIntegrationService', 'Quiz history disabled - skipping save', {
          userId: quizData.user_id,
          quizType: quizData.quiz_type
        });
        return;
      }

      logger.info('HistoryIntegrationService', 'Saving quiz to history', {
        userId: quizData.user_id,
        quizType: quizData.quiz_type,
        score: quizData.score,
        questionCount: quizData.questions?.questions?.length || 0
      });

      // Validate required fields before saving
      if (!quizData.user_id || !quizData.quiz_type || !quizData.questions) {
        throw new Error('Missing required fields for quiz history');
      }

      // Ensure correct data types for database
      const historyEntry = {
        user_id: quizData.user_id,
        file_id: quizData.file_id || null,
        note_id: quizData.note_id || null,
        quiz_type: quizData.quiz_type,
        questions: quizData.questions as any,
        answers: quizData.answers as any,
        score: Math.round(quizData.score || 0),
        time_spent_minutes: Math.round(quizData.time_spent_minutes || 0),
        completed: true,
        ai_service: quizData.ai_service || 'openai',
        model_used: quizData.model_used || 'gpt-4o-mini',
        completed_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('quiz_sessions')
        .insert(historyEntry)
        .select()
        .single();

      if (error) {
        logger.error('HistoryIntegrationService', 'Database save failed', error);
        throw error;
      }

      logger.info('HistoryIntegrationService', 'Quiz saved successfully to history', {
        historyId: data.id,
        score: historyEntry.score
      });

      // Silent success - no UI notification to avoid disrupting quiz flow
      
    } catch (error) {
      logger.error('HistoryIntegrationService', 'Failed to save quiz to history', error);
      
      // Silent failure - log error but don't disrupt user experience
      // The quiz generation and UI should continue working even if history fails
      console.warn('Quiz history save failed (non-critical):', error);
    }
  }

  /**
   * Save file enhancement results to history
   */
  static async saveFileEnhancementToHistory(enhancementData: FileEnhancementHistoryEntry): Promise<boolean> {
    try {
      // Check if note enhancement history is enabled for this user
      const isEnabled = await HistoryPreferenceService.isEnabled(enhancementData.user_id, 'note_enhancements');
      if (!isEnabled) {
        logger.info('HistoryIntegrationService', 'Note enhancement history disabled - skipping save', {
          userId: enhancementData.user_id,
          fileId: enhancementData.file_id,
          enhancementType: enhancementData.enhancement_type
        });
        return true; // Return true to not break the flow
      }

      logger.info('HistoryIntegrationService', 'Saving file enhancement to history', {
        userId: enhancementData.user_id,
        fileId: enhancementData.file_id,
        enhancementType: enhancementData.enhancement_type,
        aiService: enhancementData.ai_service,
        sessionId: enhancementData.session_id
      });

      // Validate required fields before saving
      if (!enhancementData.user_id || !enhancementData.file_id || !enhancementData.enhancement_type || !enhancementData.enhanced_content) {
        throw new Error('Missing required fields for file enhancement history');
      }

      // Ensure correct data types for database
      const historyEntry = {
        user_id: enhancementData.user_id,
        file_id: enhancementData.file_id,
        note_id: null, // Explicitly null for file enhancements
        enhancement_type: enhancementData.enhancement_type,
        original_content: enhancementData.original_content.substring(0, 10000), // Limit size
        enhanced_content: enhancementData.enhanced_content as any,
        ai_service: enhancementData.ai_service,
        model_used: enhancementData.model_used,
        confidence_score: enhancementData.confidence_score || 85,
        is_applied: false,
        session_id: enhancementData.session_id
      };

      const { data, error } = await supabase
        .from('note_enhancements')
        .insert(historyEntry as any)
        .select()
        .single();

      if (error) {
        logger.error('HistoryIntegrationService', 'File enhancement database save failed', error);
        throw error;
      }

      logger.info('HistoryIntegrationService', 'File enhancement saved successfully to history', {
        historyId: data.id,
        enhancementType: historyEntry.enhancement_type,
        sessionId: historyEntry.session_id
      });

      return true;
      
    } catch (error) {
      logger.error('HistoryIntegrationService', 'Failed to save file enhancement to history', error);
      return false;
    }
  }

  /**
   * Validate that history saving won't interfere with operations
   */
  static validateHistoryIntegration(): boolean {
    try {
      // Check if Supabase client is available
      if (!supabase) {
        logger.warn('HistoryIntegrationService', 'Supabase client not available');
        return false;
      }

      // Check if tables are accessible (non-blocking check)
      (async () => {
        try {
          // Test quiz_sessions table
          const { error: quizError } = await supabase
            .from('quiz_sessions')
            .select('count')
            .limit(1);
          
          // Test note_enhancements table  
          const { error: enhancementError } = await supabase
            .from('note_enhancements')
            .select('count')
            .limit(1);
          
          if (quizError || enhancementError) {
            logger.warn('HistoryIntegrationService', 'History tables not accessible', { quizError, enhancementError });
          } else {
            logger.info('HistoryIntegrationService', 'History integration validated');
          }
        } catch (error) {
          logger.warn('HistoryIntegrationService', 'History validation failed silently', error);
        }
      })();

      return true;
    } catch (error) {
      logger.warn('HistoryIntegrationService', 'History validation failed', error);
      return false;
    }
  }

  /**
   * Get quiz history for dashboard (separate from quiz generation)
   */
  static async getQuizHistory(userId: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('HistoryIntegrationService', 'Failed to fetch quiz history', error);
      return [];
    }
  }

  /**
   * Get file enhancement history for dashboard
   */
  static async getFileEnhancementHistory(userId: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from('note_enhancements')
        .select(`
          *,
          files!note_enhancements_file_id_fkey(name, file_type)
        `)
        .eq('user_id', userId)
        .not('file_id', 'is', null) // Only file enhancements
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('HistoryIntegrationService', 'Failed to fetch file enhancement history', error);
      return [];
    }
  }
}
