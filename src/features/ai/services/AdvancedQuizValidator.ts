

import { AdvancedQuizConfig, AdvancedQuestion, AdvancedQuestionType } from '../types/advancedQuiz';
import { AnswerNormalizer } from '../utils/answerNormalization';
import { logger } from '../utils/DebugLogger';

/**
 * AdvancedQuizValidator - Comprehensive validation service for advanced quiz components
 * 
 * PURPOSE: Ensures data integrity and quality throughout the quiz generation and execution process
 * 
 * VALIDATION SCOPE:
 * - Quiz configuration parameters
 * - Individual question structure and content
 * - Visual content format and validity
 * - Quiz session data consistency
 * - Question count and distribution validation
 * 
 * RECENT ENHANCEMENTS (Phase 3):
 * - Enhanced question validation with detailed error reporting
 * - Improved visual content validation including base64 format checking
 * - Added question count and distribution validation methods
 * - Comprehensive logging for debugging support
 * - Standardized answer format validation and normalization
 * 
 * INTEGRATION POINTS:
 * - Used by AdvancedQuizService during question transformation
 * - Called by UI components for configuration validation
 * - Integrates with AnswerNormalizer for consistent answer handling
 * - Provides sanitization utilities for content processing
 */
export class AdvancedQuizValidator {
  /**
   * CONFIGURATION VALIDATION
   * 
   * Validates the entire quiz configuration object before generation
   * Ensures all parameters are within acceptable ranges and formats
   * 
   * @param config - The quiz configuration to validate
   * @returns Validation result with specific error messages
   */
  static validateConfig(config: AdvancedQuizConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Question count validation
    if (config.questionCount < 1 || config.questionCount > 50) {
      errors.push('Question count must be between 1 and 50');
    }

    // Question types validation
    if (config.questionTypes.length === 0) {
      errors.push('At least one question type must be selected');
    }

    // Validate against supported question types
    const validQuestionTypes: AdvancedQuestionType[] = [
      'multiple_choice_extended', 'true_false_explained', 'scenario_based',
      'visual_interpretation', 'multi_part', 'diagram_labeling', 
      'chart_analysis', 'comparison', 'essay_short'
    ];

    const invalidTypes = config.questionTypes.filter(type => !validQuestionTypes.includes(type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid question types: ${invalidTypes.join(', ')}`);
    }

    // Categories validation (reasonable limits)
    if (config.categories.length > 10) {
      errors.push('Maximum 10 categories allowed');
    }

    // Custom keywords validation
    if (config.customKeywords.length > 20) {
      errors.push('Maximum 20 custom keywords allowed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * INDIVIDUAL QUESTION VALIDATION - Enhanced in Phase 3
   * 
   * Performs comprehensive validation of each generated question
   * Includes type-specific validation rules and enhanced error reporting
   * 
   * VALIDATION CATEGORIES:
   * - Basic structure (question text, explanation, metadata)
   * - Type-specific requirements (options for MC, boolean for T/F, etc.)
   * - Visual content validation for visual question types
   * - Answer format standardization and validation
   * 
   * @param question - Question to validate
   * @returns Detailed validation result with specific error messages
   */
  static validateQuestion(question: AdvancedQuestion): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic structure validation
    if (!question.question || question.question.length < 10) {
      errors.push('Question text must be at least 10 characters');
    }

    if (!question.explanation || question.explanation.length < 20) {
      errors.push('Explanation must be at least 20 characters');
    }

    // TYPE-SPECIFIC VALIDATION - Enhanced validation logic
    switch (question.type) {
      case 'multiple_choice_extended':
        if (!question.options || question.options.length < 3) {
          errors.push('Multiple choice questions must have at least 3 options');
        }
        if (!question.correctAnswer) {
          errors.push('Multiple choice questions must have a correct answer');
        }
        // Validate that correct answer exists in options
        if (question.options && question.correctAnswer) {
          const normalizedCorrect = AnswerNormalizer.normalizeCorrectAnswer(question.correctAnswer, question.type);
          const hasValidOption = question.options.some(opt => 
            AnswerNormalizer.normalizeMultipleChoiceAnswer(opt) === normalizedCorrect
          );
          if (!hasValidOption) {
            errors.push('Correct answer must match one of the provided options');
          }
        }
        break;

      case 'true_false_explained':
        if (typeof question.correctAnswer !== 'boolean') {
          errors.push('True/false questions must have a boolean correct answer');
        }
        break;

      case 'multi_part':
        if (!question.subQuestions || question.subQuestions.length < 2) {
          errors.push('Multi-part questions must have at least 2 sub-questions');
        }
        break;

      // VISUAL QUESTION TYPES - Enhanced validation
      case 'visual_interpretation':
      case 'diagram_labeling':
      case 'chart_analysis':
        // Visual questions should either have visual content or be text-based fallbacks
        if (!question.visualContent && !question.question.includes('described') && !question.question.includes('mentioned')) {
          logger.warn('AdvancedQuizValidator', `Visual question type ${question.type} without visual content or text fallback`);
        }
        
        // If visual content exists, validate it thoroughly
        if (question.visualContent) {
          if (!this.validateVisualContent(question.visualContent)) {
            errors.push('Invalid visual content format');
          }
        }
        break;
    }

    // METADATA VALIDATION - Enhanced requirements
    if (!question.metadata) {
      errors.push('Question metadata is required');
    } else {
      if (question.metadata.difficulty < 1 || question.metadata.difficulty > 5) {
        errors.push('Difficulty must be between 1 and 5');
      }
      if (question.metadata.estimatedTime < 10 || question.metadata.estimatedTime > 600) {
        errors.push('Estimated time must be between 10 and 600 seconds');
      }
      if (!question.metadata.categories || question.metadata.categories.length === 0) {
        errors.push('At least one category must be specified in metadata');
      }
      if (!question.metadata.learningObjective || question.metadata.learningObjective.length < 5) {
        errors.push('Learning objective must be specified and meaningful');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * VISUAL CONTENT VALIDATION - Phase 3 Enhancement
   * 
   * Performs thorough validation of visual content objects
   * Includes base64 format checking and content structure validation
   * 
   * VALIDATION CHECKS:
   * - Content type validation (image, chart, diagram)
   * - Base64 data format validation  
   * - Description adequacy check
   * - Overall structure integrity
   * 
   * @param visualContent - Visual content object to validate
   * @returns Boolean indicating if visual content is valid
   */
  static validateVisualContent(visualContent: any): boolean {
    if (!visualContent || typeof visualContent !== 'object') {
      return false;
    }

    // Validate content type
    const validTypes = ['image', 'chart', 'diagram'];
    if (!validTypes.includes(visualContent.type)) {
      logger.warn('AdvancedQuizValidator', 'Invalid visual content type', { type: visualContent.type });
      return false;
    }

    // Check for base64 data if present
    if (visualContent.data) {
      if (typeof visualContent.data !== 'string') {
        return false;
      }
      
      // Enhanced base64 validation
      if (!this.isValidBase64(visualContent.data)) {
        logger.warn('AdvancedQuizValidator', 'Invalid base64 data in visual content');
        return false;
      }
    }

    // Description validation
    if (!visualContent.description || typeof visualContent.description !== 'string' || visualContent.description.length < 10) {
      logger.warn('AdvancedQuizValidator', 'Visual content missing adequate description');
      return false;
    }

    return true;
  }

  /**
   * BASE64 FORMAT VALIDATION
   * 
   * Validates base64 encoded image data
   * Handles both data URL format and plain base64
   * 
   * @param str - String to validate as base64
   * @returns Boolean indicating if string is valid base64
   */
  private static isValidBase64(str: string): boolean {
    try {
      // Check if it's a data URL format
      if (str.startsWith('data:image/')) {
        const base64Part = str.split(',')[1];
        if (!base64Part) return false;
        return btoa(atob(base64Part)) === base64Part;
      }
      // Check plain base64
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  /**
   * QUIZ SESSION VALIDATION
   * 
   * Validates the consistency between questions and answers in a quiz session
   * Ensures answer formats match question types
   * 
   * @param questions - Array of quiz questions
   * @param answers - Array of user answers
   * @returns Validation result with specific errors
   */
  static validateQuizSession(questions: AdvancedQuestion[], answers: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (questions.length !== answers.length) {
      errors.push('Number of questions and answers must match');
    }

    questions.forEach((question, index) => {
      const answer = answers[index];
      
      switch (question.type) {
        case 'multiple_choice_extended':
          if (question.options && answer !== null && answer !== undefined) {
            const normalizedAnswer = AnswerNormalizer.normalizeUserAnswer(answer, question.type);
            const hasValidOption = question.options.some(opt => 
              AnswerNormalizer.normalizeMultipleChoiceAnswer(opt) === normalizedAnswer
            );
            if (!hasValidOption) {
              errors.push(`Invalid answer for question ${index + 1}: ${answer}`);
            }
          }
          break;

        case 'true_false_explained':
          if (answer !== null && answer !== undefined && typeof answer !== 'boolean' && 
              !['true', 'false', 'True', 'False'].includes(String(answer))) {
            errors.push(`True/false answer must be boolean or boolean string for question ${index + 1}`);
          }
          break;

        case 'multi_part':
          if (answer !== null && answer !== undefined) {
            if (!Array.isArray(answer) || answer.length !== (question.subQuestions?.length || 0)) {
              errors.push(`Multi-part answer must be an array matching sub-question count for question ${index + 1}`);
            }
          }
          break;
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * QUESTION COUNT VALIDATION - Phase 3 Implementation
   * 
   * Validates whether the generated question count meets requirements
   * Provides warnings for partial success scenarios
   * 
   * @param requested - Number of questions requested
   * @param generated - Number of questions actually generated
   * @returns Validation result with warnings if applicable
   */
  static validateQuestionCount(requested: number, generated: number): { valid: boolean; warning?: string } {
    if (generated === requested) {
      return { valid: true };
    }

    const ratio = generated / requested;
    
    // Accept if we got at least 80% of requested questions
    if (ratio >= 0.8) {
      return { 
        valid: true, 
        warning: `Generated ${generated} questions instead of ${requested} due to content limitations` 
      };
    }

    return { 
      valid: false, 
      warning: `Only generated ${generated} out of ${requested} requested questions. This is insufficient for a quality quiz experience.` 
    };
  }

  /**
   * QUESTION DISTRIBUTION VALIDATION - Phase 3 Implementation
   * 
   * Analyzes whether generated questions properly represent requested question types
   * Identifies missing types and uneven distributions
   * 
   * @param questions - Generated questions
   * @param config - Original quiz configuration
   * @returns Validation result with distribution warnings
   */
  static validateQuestionDistribution(questions: AdvancedQuestion[], config: AdvancedQuizConfig): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const typeDistribution = questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestedTypes = config.questionTypes;
    const generatedTypes = Object.keys(typeDistribution);

    // Check if all requested types are represented
    const missingTypes = requestedTypes.filter(type => !generatedTypes.includes(type));
    if (missingTypes.length > 0) {
      warnings.push(`Missing question types: ${missingTypes.join(', ')}`);
    }

    // Check for balanced distribution
    const averagePerType = questions.length / requestedTypes.length;
    const imbalancedTypes = generatedTypes.filter(type => {
      const count = typeDistribution[type];
      return Math.abs(count - averagePerType) > Math.ceil(averagePerType * 0.5);
    });

    if (imbalancedTypes.length > 0) {
      warnings.push(`Uneven distribution detected for types: ${imbalancedTypes.join(', ')}`);
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * CONTENT SANITIZATION
   * 
   * Removes potentially harmful content and cleans up input text
   * Essential for security when processing user-provided content
   * 
   * @param content - Raw content to sanitize
   * @returns Cleaned and safe content string
   */
  static sanitizeContent(content: string): string {
    // Remove potentially harmful content and clean up
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .trim();
  }

  /**
   * ANSWER FORMAT STANDARDIZATION
   * 
   * Ensures consistent answer formats across all questions
   * Integrates with AnswerNormalizer for consistent handling
   * 
   * @param questions - Questions to standardize
   * @returns Questions with standardized answer formats
   */
  static standardizeAnswerFormats(questions: AdvancedQuestion[]): AdvancedQuestion[] {
    return questions.map(question => {
      const standardizedQuestion = { ...question };

      // Standardize multiple choice answer format
      if (question.type === 'multiple_choice_extended' && question.correctAnswer && question.options) {
        const normalizedCorrect = AnswerNormalizer.normalizeCorrectAnswer(question.correctAnswer, question.type);
        
        // Ensure correct answer matches the standardized format
        const matchingOption = question.options.find(opt => 
          AnswerNormalizer.normalizeMultipleChoiceAnswer(opt) === normalizedCorrect
        );
        
        if (matchingOption) {
          standardizedQuestion.correctAnswer = normalizedCorrect;
        }
      }

      return standardizedQuestion;
    });
  }

  /**
   * VALIDATION LOGGING UTILITY
   * 
   * Provides consistent logging for validation results
   * Helps with debugging and monitoring validation issues
   * 
   * @param component - Component being validated
   * @param validation - Validation result to log
   */
  static logValidation(component: string, validation: { valid: boolean; errors?: string[]; warnings?: string[] }) {
    if (!validation.valid && validation.errors) {
      logger.error('AdvancedQuizValidator', `Validation failed for ${component}`, {
        errors: validation.errors
      });
    } else if (validation.warnings && validation.warnings.length > 0) {
      logger.warn('AdvancedQuizValidator', `Validation warnings for ${component}`, {
        warnings: validation.warnings
      });
    } else {
      logger.info('AdvancedQuizValidator', `Validation passed for ${component}`);
    }
  }
}
