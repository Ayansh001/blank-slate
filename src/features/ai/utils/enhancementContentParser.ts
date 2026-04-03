
import { parseAIResponse, extractContentFromResponse } from '@/utils/aiResponseParser';

export interface ParsedEnhancementContent {
  success: boolean;
  data?: any;
  error?: string;
  type?: string;
}

export class EnhancementContentParser {
  static parseEnhancementForDialog(record: any): ParsedEnhancementContent {
    if (!record) {
      return { success: false, error: 'No record provided' };
    }

    try {
      // Extract content from various possible structures
      let contentToParse = record.enhanced_content || record.content || record.enhancement || record.result || record;
      
      // Handle string content that might be JSON
      if (typeof contentToParse === 'string') {
        try {
          contentToParse = JSON.parse(contentToParse);
        } catch {
          // If not JSON, treat as plain text
          return {
            success: true,
            data: { content: contentToParse },
            type: record.enhancement_type || 'unknown'
          };
        }
      }

      // If it's already an object, validate structure based on type
      if (typeof contentToParse === 'object' && contentToParse !== null) {
        const enhancementType = record.enhancement_type;
        
        switch (enhancementType) {
          case 'summary':
            return this.parseSummaryContent(contentToParse, record);
          case 'key_points':
            return this.parseKeyPointsContent(contentToParse, record);
          case 'questions':
            return this.parseQuestionsContent(contentToParse, record);
          default:
            return {
              success: true,
              data: contentToParse,
              type: enhancementType || 'unknown'
            };
        }
      }

      return { success: false, error: 'Unable to parse content' };
    } catch (error) {
      console.error('Enhancement parsing error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Parsing failed' };
    }
  }

  private static parseSummaryContent(content: any, record: any): ParsedEnhancementContent {
    return {
      success: true,
      data: {
        summary: content.summary || content.text || content.content || 'No summary available',
        keyTakeaways: content.keyTakeaways || content.key_takeaways || [],
        wordCount: content.wordCount || content.word_count || { original: 0, summary: 0 }
      },
      type: 'summary'
    };
  }

  private static parseKeyPointsContent(content: any, record: any): ParsedEnhancementContent {
    return {
      success: true,
      data: {
        keyPoints: content.keyPoints || content.key_points || [],
        categories: content.categories || []
      },
      type: 'key_points'
    };
  }

  private static parseQuestionsContent(content: any, record: any): ParsedEnhancementContent {
    return {
      success: true,
      data: {
        studyQuestions: content.studyQuestions || content.study_questions || [],
        reviewQuestions: content.reviewQuestions || content.review_questions || []
      },
      type: 'questions'
    };
  }

  static getAllEnhancementsForNote(enhancements: any[], noteId: string): any[] {
    return enhancements.filter(enhancement => enhancement.note_id === noteId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}
