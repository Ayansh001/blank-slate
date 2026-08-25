import { supabase } from '@/integrations/supabase/client';
import { logger } from './DebugLogger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixed: string[];
}

export class HistoryValidationService {
  static async validateQuizSessions(userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixed: []
    };

    try {
      const { data: sessions, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        result.errors.push(`Failed to fetch quiz sessions: ${error.message}`);
        result.isValid = false;
        return result;
      }

      // Check for missing fields
      const invalidSessions = sessions?.filter(s => !s.quiz_type || !s.questions || !s.score) || [];
      if (invalidSessions.length > 0) {
        result.warnings.push(`Found ${invalidSessions.length} quiz sessions with missing required fields`);
        result.isValid = false;
      }

      // Check for orphaned sessions (file_id or note_id references non-existent records)
      // (This requires separate queries per session, so it's not done here for performance reasons)

      // Check for malformed questions/answers
      sessions?.forEach(session => {
        try {
          JSON.stringify(session.questions);
          JSON.stringify(session.answers);
        } catch (e: any) {
          result.errors.push(`Malformed questions or answers in session ${session.id}: ${e.message}`);
          result.isValid = false;
        }
      });

      logger.info('HistoryValidation', 'Quiz sessions validation completed', {
        totalSessions: sessions?.length || 0,
        invalidCount: invalidSessions.length
      });

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
      logger.error('HistoryValidation', 'Quiz sessions validation error', error);
    }

    return result;
  }

  static async validateNoteEnhancements(userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixed: []
    };

    try {
      const { data: enhancements, error } = await supabase
        .from('note_enhancements')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        result.errors.push(`Failed to fetch note enhancements: ${error.message}`);
        result.isValid = false;
        return result;
      }

      // Check for invalid enhancements - must have either note_id or file_id
      const invalidEnhancements = enhancements?.filter(e => 
        !e.enhancement_type || (!e.note_id && !e.file_id)
      ) || [];

      if (invalidEnhancements.length > 0) {
        result.warnings.push(`Found ${invalidEnhancements.length} enhancements with missing required fields`);
        logger.warn('HistoryValidation', 'Invalid enhancements found', { 
          count: invalidEnhancements.length,
          examples: invalidEnhancements.slice(0, 3).map(e => e.id)
        });
      }

      // Check for orphaned enhancements (file_id or note_id references non-existent records)
      const orphanedEnhancements = [];
      for (const enhancement of enhancements || []) {
        if (enhancement.note_id) {
          const { data: note, error: noteError } = await supabase
            .from('notes')
            .select('id')
            .eq('id', enhancement.note_id)
            .single();

          if (noteError || !note) {
            orphanedEnhancements.push({ id: enhancement.id, type: 'note', refId: enhancement.note_id });
          }
        } else if (enhancement.file_id) {
          const { data: file, error: fileError } = await supabase
            .from('files')
            .select('id')
            .eq('id', enhancement.file_id)
            .single();

          if (fileError || !file) {
            orphanedEnhancements.push({ id: enhancement.id, type: 'file', refId: enhancement.file_id });
          }
        }
      }

      if (orphanedEnhancements.length > 0) {
        result.warnings.push(`Found ${orphanedEnhancements.length} enhancements referencing non-existent ${orphanedEnhancements[0].type} records`);
        logger.warn('HistoryValidation', 'Orphaned enhancements found', {
          count: orphanedEnhancements.length,
          examples: orphanedEnhancements.slice(0, 3).map(e => ({ id: e.id, refId: e.refId, type: e.type }))
        });
      }

      // Check for malformed enhanced_content
      enhancements?.forEach(enhancement => {
        try {
          JSON.stringify(enhancement.enhanced_content);
        } catch (e: any) {
          result.errors.push(`Malformed enhanced_content in enhancement ${enhancement.id}: ${e.message}`);
          result.isValid = false;
        }
      });

      logger.info('HistoryValidation', 'Note enhancements validation completed', {
        totalEnhancements: enhancements?.length || 0,
        invalidCount: invalidEnhancements.length
      });

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
      logger.error('HistoryValidation', 'Note enhancements validation error', error);
    }

    return result;
  }

  static async validateChatSessions(userId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      fixed: []
    };

    try {
      const { data: sessions, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        result.errors.push(`Failed to fetch chat sessions: ${error.message}`);
        result.isValid = false;
        return result;
      }

      // Check for missing fields
      const invalidSessions = sessions?.filter(s => !s.ai_service) || [];
      if (invalidSessions.length > 0) {
        result.warnings.push(`Found ${invalidSessions.length} chat sessions with missing required fields`);
        result.isValid = false;
      }

      // Check for orphaned messages (session_id references non-existent records)
      // (This requires separate queries per session, so it's not done here for performance reasons)

      logger.info('HistoryValidation', 'Chat sessions validation completed', {
        totalSessions: sessions?.length || 0,
        invalidCount: invalidSessions.length
      });

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
      logger.error('HistoryValidation', 'Chat sessions validation error', error);
    }

    return result;
  }

  static async validateAllUserHistory(userId: string): Promise<ValidationResult> {
    const quizResult = await this.validateQuizSessions(userId);
    const enhancementResult = await this.validateNoteEnhancements(userId);
    const chatResult = await this.validateChatSessions(userId);

    const combinedResult: ValidationResult = {
      isValid: quizResult.isValid && enhancementResult.isValid && chatResult.isValid,
      errors: [...quizResult.errors, ...enhancementResult.errors, ...chatResult.errors],
      warnings: [...quizResult.warnings, ...enhancementResult.warnings, ...chatResult.warnings],
      fixed: [...quizResult.fixed, ...enhancementResult.fixed, ...chatResult.fixed]
    };

    return combinedResult;
  }
}
