
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../utils/DebugLogger';

export interface TableValidationResult {
  tableName: string;
  exists: boolean;
  accessible: boolean;
  error?: string;
}

// Define valid table names as const for type safety
const VALID_TABLE_NAMES = ['quiz_sessions', 'note_enhancements', 'ai_chat_sessions'] as const;
type ValidTableName = typeof VALID_TABLE_NAMES[number];

// Type guard to check if string is a valid table name
function isValidTableName(tableName: string): tableName is ValidTableName {
  return VALID_TABLE_NAMES.includes(tableName as ValidTableName);
}

export class DatabaseValidationService {
  private static validationCache = new Map<string, TableValidationResult>();
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private static lastCacheUpdate = 0;

  /**
   * Validate that required tables exist and are accessible
   */
  static async validateAIHistoryTables(userId: string): Promise<TableValidationResult[]> {
    const currentTime = Date.now();
    
    // Return cached results if still valid
    if (currentTime - this.lastCacheUpdate < this.cacheExpiry && this.validationCache.size > 0) {
      console.log('DatabaseValidationService: Using cached validation results');
      return Array.from(this.validationCache.values());
    }

    console.log('DatabaseValidationService: Performing fresh table validation');
    const tables = ['quiz_sessions', 'note_enhancements', 'ai_chat_sessions'];
    const results: TableValidationResult[] = [];

    for (const tableName of tables) {
      try {
        const result = await this.validateTable(tableName, userId);
        results.push(result);
        this.validationCache.set(tableName, result);
      } catch (error) {
        const errorResult: TableValidationResult = {
          tableName,
          exists: false,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        results.push(errorResult);
        this.validationCache.set(tableName, errorResult);
      }
    }

    this.lastCacheUpdate = currentTime;
    console.log('DatabaseValidationService: Validation complete', results);
    return results;
  }

  /**
   * Validate a specific table with simplified query approach
   */
  private static async validateTable(tableName: string, userId: string): Promise<TableValidationResult> {
    try {
      // Type-safe table name validation
      if (!isValidTableName(tableName)) {
        return {
          tableName,
          exists: false,
          accessible: false,
          error: `Invalid table name: ${tableName}`
        };
      }

      // Use a simplified approach to avoid type recursion issues
      let query;
      
      switch (tableName) {
        case 'quiz_sessions':
          query = supabase
            .from('quiz_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .limit(1);
          break;
        case 'note_enhancements':
          query = supabase
            .from('note_enhancements')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .limit(1);
          break;
        case 'ai_chat_sessions':
          query = supabase
            .from('ai_chat_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .limit(1);
          break;
        default:
          throw new Error(`Unsupported table: ${tableName}`);
      }

      const { error, count } = await query;

      if (error) {
        logger.warn('DatabaseValidationService', `Table ${tableName} validation failed`, error);
        
        // Check if it's a "table doesn't exist" error
        if (error.message.includes('does not exist') || (error.message.includes('relation') && error.message.includes('does not exist'))) {
          return {
            tableName,
            exists: false,
            accessible: false,
            error: `Table ${tableName} does not exist`
          };
        }

        // Other errors might indicate permissions or other issues
        return {
          tableName,
          exists: true,
          accessible: false,
          error: error.message
        };
      }

      logger.info('DatabaseValidationService', `Table ${tableName} is valid`, { count });
      return {
        tableName,
        exists: true,
        accessible: true
      };

    } catch (error) {
      logger.error('DatabaseValidationService', `Unexpected error validating ${tableName}`, error);
      return {
        tableName,
        exists: false,
        accessible: false,
        error: error instanceof Error ? error.message : 'Unexpected validation error'
      };
    }
  }

  /**
   * Get cached validation result for a specific table
   */
  static getCachedValidation(tableName: string): TableValidationResult | null {
    const currentTime = Date.now();
    
    if (currentTime - this.lastCacheUpdate > this.cacheExpiry) {
      return null;
    }

    return this.validationCache.get(tableName) || null;
  }

  /**
   * Clear validation cache (useful for testing or manual refresh)
   */
  static clearCache(): void {
    console.log('DatabaseValidationService: Clearing validation cache');
    this.validationCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * Get a summary of table accessibility
   */
  static getTableSummary(): { accessible: string[], inaccessible: string[], unknown: string[] } {
    const accessible: string[] = [];
    const inaccessible: string[] = [];
    const unknown: string[] = [];

    for (const [tableName, result] of this.validationCache.entries()) {
      if (result.accessible) {
        accessible.push(tableName);
      } else if (result.exists === false) {
        inaccessible.push(tableName);
      } else {
        unknown.push(tableName);
      }
    }

    return { accessible, inaccessible, unknown };
  }
}
