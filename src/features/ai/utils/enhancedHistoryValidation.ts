
import { supabase } from '@/integrations/supabase/client';
import { logger } from './DebugLogger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixed: string[];
}

export class EnhancedHistoryValidationService {
  static async validateAndRepairQuizSessions(userId: string): Promise<ValidationResult> {
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

      // Fix missing required fields
      const sessionsToUpdate = [];
      const orphanedSessions = [];

      for (const session of sessions || []) {
        let needsUpdate = false;
        const updates: any = {};

        // Fix missing quiz_type
        if (!session.quiz_type) {
          updates.quiz_type = 'multiple_choice';
          needsUpdate = true;
        }

        // Fix missing score
        if (session.score === null || session.score === undefined) {
          updates.score = 0;
          needsUpdate = true;
        }

        // Fix malformed questions
        try {
          if (session.questions) {
            JSON.parse(JSON.stringify(session.questions));
          } else {
            updates.questions = [];
            needsUpdate = true;
          }
        } catch (e) {
          updates.questions = [];
          needsUpdate = true;
        }

        // Fix malformed answers
        try {
          if (session.answers) {
            JSON.parse(JSON.stringify(session.answers));
          } else {
            updates.answers = [];
            needsUpdate = true;
          }
        } catch (e) {
          updates.answers = [];
          needsUpdate = true;
        }

        if (needsUpdate) {
          sessionsToUpdate.push({ id: session.id, updates });
        }

        // Check for orphaned records
        if (session.note_id) {
          const { data: note } = await supabase
            .from('notes')
            .select('id')
            .eq('id', session.note_id)
            .single();
          if (!note) {
            orphanedSessions.push(session.id);
          }
        } else if (session.file_id) {
          const { data: file } = await supabase
            .from('files')
            .select('id')
            .eq('id', session.file_id)
            .single();
          if (!file) {
            orphanedSessions.push(session.id);
          }
        }
      }

      // Apply updates
      for (const { id, updates } of sessionsToUpdate) {
        const { error: updateError } = await supabase
          .from('quiz_sessions')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) {
          result.errors.push(`Failed to update session ${id}: ${updateError.message}`);
          result.isValid = false;
        } else {
          result.fixed.push(`Fixed quiz session ${id} - updated ${Object.keys(updates).join(', ')}`);
        }
      }

      // Delete orphaned sessions
      if (orphanedSessions.length > 0) {
        const { error: deleteError } = await supabase
          .from('quiz_sessions')
          .delete()
          .in('id', orphanedSessions)
          .eq('user_id', userId);

        if (deleteError) {
          result.errors.push(`Failed to delete orphaned sessions: ${deleteError.message}`);
          result.isValid = false;
        } else {
          result.fixed.push(`Deleted ${orphanedSessions.length} orphaned quiz sessions`);
        }
      }

      if (orphanedSessions.length > 0) {
        result.warnings.push(`Found and removed ${orphanedSessions.length} orphaned quiz sessions`);
      }

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  static async validateAndRepairNoteEnhancements(userId: string): Promise<ValidationResult> {
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

      const enhancementsToUpdate = [];
      const orphanedEnhancements = [];

      for (const enhancement of enhancements || []) {
        let needsUpdate = false;
        const updates: any = {};

        // Fix missing enhancement_type
        if (!enhancement.enhancement_type) {
          updates.enhancement_type = 'summary';
          needsUpdate = true;
        }

        // Fix malformed enhanced_content
        try {
          if (enhancement.enhanced_content) {
            JSON.parse(JSON.stringify(enhancement.enhanced_content));
          }
        } catch (e) {
          updates.enhanced_content = { error: 'Malformed content was repaired' };
          needsUpdate = true;
        }

        if (needsUpdate) {
          enhancementsToUpdate.push({ id: enhancement.id, updates });
        }

        // Check for orphaned records
        if (enhancement.note_id) {
          const { data: note } = await supabase
            .from('notes')
            .select('id')
            .eq('id', enhancement.note_id)
            .single();
          if (!note) {
            orphanedEnhancements.push(enhancement.id);
          }
        } else if (enhancement.file_id) {
          const { data: file } = await supabase
            .from('files')
            .select('id')
            .eq('id', enhancement.file_id)
            .single();
          if (!file) {
            orphanedEnhancements.push(enhancement.id);
          }
        }
      }

      // Apply updates
      for (const { id, updates } of enhancementsToUpdate) {
        const { error: updateError } = await supabase
          .from('note_enhancements')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) {
          result.errors.push(`Failed to update enhancement ${id}: ${updateError.message}`);
          result.isValid = false;
        } else {
          result.fixed.push(`Fixed note enhancement ${id} - updated ${Object.keys(updates).join(', ')}`);
        }
      }

      // Delete orphaned enhancements
      if (orphanedEnhancements.length > 0) {
        const { error: deleteError } = await supabase
          .from('note_enhancements')
          .delete()
          .in('id', orphanedEnhancements)
          .eq('user_id', userId);

        if (deleteError) {
          result.errors.push(`Failed to delete orphaned enhancements: ${deleteError.message}`);
          result.isValid = false;
        } else {
          result.fixed.push(`Deleted ${orphanedEnhancements.length} orphaned note enhancements`);
        }
      }

      if (orphanedEnhancements.length > 0) {
        result.warnings.push(`Found and removed ${orphanedEnhancements.length} orphaned enhancements`);
      }

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  static async validateAndRepairChatSessions(userId: string): Promise<ValidationResult> {
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

      const sessionsToUpdate = [];

      for (const session of sessions || []) {
        let needsUpdate = false;
        const updates: any = {};

        // Fix missing ai_service
        if (!session.ai_service) {
          updates.ai_service = 'openai';
          needsUpdate = true;
        }

        // Fix missing total_messages
        if (session.total_messages === null || session.total_messages === undefined) {
          const { data: messages } = await supabase
            .from('ai_chat_messages')
            .select('id')
            .eq('session_id', session.id);
          
          updates.total_messages = messages?.length || 0;
          needsUpdate = true;
        }

        if (needsUpdate) {
          sessionsToUpdate.push({ id: session.id, updates });
        }
      }

      // Apply updates
      for (const { id, updates } of sessionsToUpdate) {
        const { error: updateError } = await supabase
          .from('ai_chat_sessions')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) {
          result.errors.push(`Failed to update chat session ${id}: ${updateError.message}`);
          result.isValid = false;
        } else {
          result.fixed.push(`Fixed chat session ${id} - updated ${Object.keys(updates).join(', ')}`);
        }
      }

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  static async validateAndRepairAllUserHistory(userId: string): Promise<ValidationResult> {
    const quizResult = await this.validateAndRepairQuizSessions(userId);
    const enhancementResult = await this.validateAndRepairNoteEnhancements(userId);
    const chatResult = await this.validateAndRepairChatSessions(userId);

    const combinedResult: ValidationResult = {
      isValid: quizResult.isValid && enhancementResult.isValid && chatResult.isValid,
      errors: [...quizResult.errors, ...enhancementResult.errors, ...chatResult.errors],
      warnings: [...quizResult.warnings, ...enhancementResult.warnings, ...chatResult.warnings],
      fixed: [...quizResult.fixed, ...enhancementResult.fixed, ...chatResult.fixed]
    };

    return combinedResult;
  }
}
