import { supabase } from '@/integrations/supabase/client';
import { AdvancedQuizConfig, AdvancedQuizSession, AdvancedQuestion, QuizAnalytics, AdvancedQuestionType } from '../types/advancedQuiz';
import { AIProviderFactory } from '../providers/AIProviderFactory';
import { AIProviderConfig } from '../types/providers';
import { AdvancedQuizPromptEngine } from './AdvancedQuizPromptEngine';
import { AdvancedQuizValidator } from './AdvancedQuizValidator';
import { parseAIResponse, validateQuizData } from '@/utils/aiResponseParser';
import { logger } from '../utils/DebugLogger';
import { toast } from 'sonner';

/**
 * AdvancedQuizService - Core service for advanced quiz generation and management
 * 
 * PURPOSE: Orchestrates the entire advanced quiz generation process
 * 
 * KEY FEATURES:
 * - AI-powered question generation with multiple retry attempts
 * - Visual content generation for diagram/chart question types
 * - Robust fallback strategies to ensure exact question counts
 * - Database integration for quiz session management
 * - Performance analytics and tracking
 * 
 * RECENT MAJOR UPDATES (Phases 1-4):
 * Phase 1: Enhanced question count enforcement via improved prompts
 * Phase 2: Iterative retry logic with up to 3 attempts and simplified prompts
 * Phase 3: Comprehensive validation and logging throughout the process  
 * Phase 4: Fallback question generation to guarantee exact counts
 * 
 * VISUAL vs TEXT QUESTION SEPARATION:
 * - Visual Types: diagram_labeling, chart_analysis, visual_interpretation
 * - Text Types: multiple_choice_extended, true_false_explained, scenario_based, multi_part, comparison, essay_short
 * - Visual content only generated for visual question types
 * - Automatic fallback to text-based equivalents if visual generation fails
 */

// Type transformation utilities for database integration
interface DatabaseAdvancedQuizSession {
  id: string;
  user_id: string;
  file_id?: string;
  note_id?: string;
  config: any;
  questions: any;
  answers: any;
  score: number;
  detailed_results: any;
  time_spent_minutes: number;
  completed: boolean;
  ai_service: string;
  model_used: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Transforms database session format to application format
 * IMPORTANT: Handles the camelCase/snake_case conversion between DB and app
 */
function transformDatabaseSession(dbSession: DatabaseAdvancedQuizSession): AdvancedQuizSession {
  return {
    id: dbSession.id,
    user_id: dbSession.user_id,
    file_id: dbSession.file_id,
    note_id: dbSession.note_id,
    config: dbSession.config as AdvancedQuizConfig,
    questions: dbSession.questions as AdvancedQuestion[],
    answers: dbSession.answers as any[],
    score: dbSession.score,
    detailedResults: dbSession.detailed_results as {
      categoryScores: Record<string, number>;
      timePerQuestion: number[];
      difficultyProgress: number[];
    },
    time_spent_minutes: dbSession.time_spent_minutes,
    completed: dbSession.completed,
    ai_service: dbSession.ai_service,
    model_used: dbSession.model_used,
    created_at: dbSession.created_at,
    completed_at: dbSession.completed_at
  };
}

export class AdvancedQuizService {
  /**
   * MAIN QUIZ GENERATION METHOD
   * 
   * This is the primary entry point for quiz generation. It implements a sophisticated
   * retry mechanism to ensure the exact number of questions is generated.
   * 
   * FLOW:
   * 1. Validate and sanitize input content
   * 2. Attempt generation with up to 3 retry attempts
   * 3. Use different prompt strategies on each attempt
   * 4. Generate fallback questions if AI doesn't produce enough
   * 5. Validate and transform all questions
   * 6. Return exactly the requested number of questions
   * 
   * VISUAL CONTENT LOGIC:
   * - Only generates visual content for visual question types
   * - Falls back to text-based content if visual generation fails
   * - Maintains question count regardless of visual content success/failure
   * 
   * @param content - Source material for quiz generation
   * @param config - Quiz configuration parameters
   * @param providerConfig - AI service configuration
   * @returns Array of generated questions (exact count guaranteed)
   */
  static async generateAdvancedQuiz(
    content: string,
    config: AdvancedQuizConfig,
    providerConfig: AIProviderConfig
  ): Promise<AdvancedQuestion[]> {
    try {
      logger.info('AdvancedQuizService', 'Starting advanced quiz generation with enhanced retry logic', {
        contentLength: content.length,
        config,
        provider: providerConfig.provider
      });

      const provider = AIProviderFactory.createProvider(providerConfig);
      const sanitizedContent = AdvancedQuizValidator.sanitizeContent(content);
      
      let allQuestions: AdvancedQuestion[] = [];
      let attempts = 0;
      const maxAttempts = 3; // Phase 2: Enhanced retry logic

      // PHASE 2 IMPLEMENTATION: Separate visual and text-based question types
      const visualQuestionTypes = ['diagram_labeling', 'chart_analysis', 'visual_interpretation'];
      const textQuestionTypes = config.questionTypes.filter(type => !visualQuestionTypes.includes(type));
      const selectedVisualTypes = config.questionTypes.filter(type => visualQuestionTypes.includes(type));

      // ENHANCED RETRY LOOP (Phase 2)
      while (allQuestions.length < config.questionCount && attempts < maxAttempts) {
        attempts++;
        const remainingCount = config.questionCount - allQuestions.length;
        
        logger.info('AdvancedQuizService', `Generation attempt ${attempts}`, {
          remainingCount,
          currentTotal: allQuestions.length,
          target: config.questionCount
        });

        try {
          // ADAPTIVE PROMPT STRATEGY: Different prompts for different attempts
          let prompt: string;
          if (attempts === 1) {
            // First attempt: Use comprehensive prompt
            prompt = AdvancedQuizPromptEngine.generateAdvancedPrompt(sanitizedContent, {
              ...config,
              questionCount: remainingCount
            });
          } else {
            // Retry attempts: Use supplementary prompt with context of existing questions
            prompt = AdvancedQuizPromptEngine.generateSupplementaryPrompt(
              sanitizedContent,
              { ...config, questionCount: remainingCount },
              remainingCount,
              allQuestions
            );
          }

          // AI API CALL with adaptive token limits
          const result = await provider.generateResponse({
            prompt,
            maxTokens: attempts === 1 ? 6000 : 4000, // Reduce tokens on retries for faster response
            temperature: 0.7
          });

          if (!result.content) {
            throw new Error(`Empty response from AI provider on attempt ${attempts}`);
          }

          // PHASE 3: Enhanced response parsing and validation
          const parsedResponse = parseAIResponse(result.content);
          if (!parsedResponse.success || !parsedResponse.data) {
            logger.warn('AdvancedQuizService', `Parse failed on attempt ${attempts}`, {
              error: parsedResponse.error
            });
            continue;
          }

          const validatedQuiz = validateQuizData(parsedResponse.data);
          if (!validatedQuiz?.questions) {
            logger.warn('AdvancedQuizService', `Validation failed on attempt ${attempts}`);
            continue;
          }

          // QUESTION TRANSFORMATION AND VALIDATION
          const newQuestions: AdvancedQuestion[] = [];
          for (let i = 0; i < validatedQuiz.questions.length && newQuestions.length < remainingCount; i++) {
            const transformedQuestion = await this.transformToAdvancedQuestion(
              validatedQuiz.questions[i], 
              allQuestions.length + newQuestions.length, 
              config
            );
            
            // PHASE 3: Strict validation with detailed logging
            if (transformedQuestion && this.validateGeneratedQuestion(transformedQuestion)) {
              newQuestions.push(transformedQuestion);
            }
          }

          logger.info('AdvancedQuizService', `Generated ${newQuestions.length} valid questions on attempt ${attempts}`);
          allQuestions.push(...newQuestions);

        } catch (error) {
          logger.warn('AdvancedQuizService', `Attempt ${attempts} failed`, error);
          if (attempts === maxAttempts) {
            throw error;
          }
        }
      }

      // PHASE 4: FALLBACK STRATEGY - Generate fallback questions if still short
      if (allQuestions.length < config.questionCount) {
        const fallbackCount = config.questionCount - allQuestions.length;
        logger.info('AdvancedQuizService', `Creating ${fallbackCount} fallback questions`);
        
        const fallbackQuestions = await this.createFallbackQuestions(
          sanitizedContent,
          config,
          fallbackCount,
          allQuestions.length
        );
        
        allQuestions.push(...fallbackQuestions);
      }

      // FINAL VALIDATION AND COUNT ENFORCEMENT
      if (allQuestions.length === 0) {
        throw new Error('No valid questions were generated from the content');
      }

      // Ensure we don't exceed the requested count
      if (allQuestions.length > config.questionCount) {
        allQuestions = allQuestions.slice(0, config.questionCount);
      }

      // Final validation of question count - must have at least 50% of requested
      if (allQuestions.length < Math.max(1, Math.floor(config.questionCount * 0.5))) {
        throw new Error(`Only generated ${allQuestions.length} questions out of ${config.questionCount} requested. Content may be insufficient.`);
      }

      logger.info('AdvancedQuizService', 'Advanced quiz generation completed', {
        requestedCount: config.questionCount,
        generatedCount: allQuestions.length,
        attempts,
        questionTypes: allQuestions.map(q => q.type)
      });

      return allQuestions;

    } catch (error) {
      logger.error('AdvancedQuizService', 'Advanced quiz generation failed', error);
      throw error;
    }
  }

  /**
   * QUESTION VALIDATION - Phase 3 Implementation
   * 
   * Validates each generated question against strict criteria
   * Logs specific validation failures for debugging
   * 
   * @param question - Question to validate
   * @returns Boolean indicating if question is valid
   */
  private static validateGeneratedQuestion(question: AdvancedQuestion): boolean {
    const validation = AdvancedQuizValidator.validateQuestion(question);
    if (!validation.valid) {
      logger.warn('AdvancedQuizService', 'Question failed validation', {
        questionId: question.id,
        errors: validation.errors
      });
      return false;
    }
    return true;
  }

  /**
   * FALLBACK QUESTION GENERATION - Phase 4 Implementation
   * 
   * Creates simple but valid questions when AI generation falls short
   * Ensures exact question count is always met
   * 
   * @param content - Source content
   * @param config - Quiz configuration  
   * @param count - Number of fallback questions needed
   * @param startIndex - Starting index for question IDs
   * @returns Array of fallback questions
   */
  private static async createFallbackQuestions(
    content: string,
    config: AdvancedQuizConfig,
    count: number,
    startIndex: number
  ): Promise<AdvancedQuestion[]> {
    const fallbackQuestions: AdvancedQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      const fallbackQuestion: AdvancedQuestion = {
        id: `fallback_q_${Date.now()}_${startIndex + i}`,
        type: 'multiple_choice_extended',
        question: `Based on the provided content, what is a key concept or principle discussed? (Fallback Question ${i + 1})`,
        options: [
          'A) Review the content for key concepts',
          'B) Analyze the main themes presented', 
          'C) Consider the important details mentioned',
          'D) Examine the core principles outlined'
        ],
        correctAnswer: 'A',
        explanation: 'This is a fallback question generated when the AI service could not produce the full requested number of questions. Please review the content to identify key concepts.',
        metadata: {
          difficulty: 2,
          categories: config.categories.length > 0 ? config.categories : ['General'],
          estimatedTime: 90,
          learningObjective: 'Content review and comprehension'
        }
      };
      
      fallbackQuestions.push(fallbackQuestion);
    }
    
    logger.info('AdvancedQuizService', `Created ${fallbackQuestions.length} fallback questions`);
    return fallbackQuestions;
  }

  /**
   * QUESTION TYPE DISTRIBUTION ANALYSIS
   * 
   * Analyzes the distribution of generated question types
   * Helps identify if AI is properly following type requirements
   * 
   * @param questions - Generated questions
   * @param requestedTypes - Types that were requested
   * @returns Analysis of type distribution
   */
  private static validateQuestionTypeDistribution(questions: AdvancedQuestion[], requestedTypes: AdvancedQuestionType[]) {
    const generatedTypes = [...new Set(questions.map(q => q.type))];
    const missingTypes = requestedTypes.filter(type => !generatedTypes.includes(type));
    
    return {
      generatedTypes,
      missingTypes,
      distribution: generatedTypes.reduce((acc, type) => {
        acc[type] = questions.filter(q => q.type === type).length;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * QUESTION TRANSFORMATION - Converts AI response to AdvancedQuestion format
   * 
   * CRITICAL VISUAL CONTENT LOGIC:
   * - Only generates visual content for visual question types
   * - Falls back to text-based content if visual generation fails  
   * - Validates all question components before transformation
   * 
   * @param q - Raw question from AI response
   * @param index - Question index for ID generation
   * @param config - Quiz configuration
   * @returns Transformed AdvancedQuestion or null if invalid
   */
  private static async transformToAdvancedQuestion(q: any, index: number, config: AdvancedQuizConfig): Promise<AdvancedQuestion | null> {
    try {
      // Basic validation
      if (!q.question || typeof q.question !== 'string') {
        logger.warn('AdvancedQuizService', 'Invalid question text', { question: q });
        return null;
      }

      // Question type validation with fallback
      let questionType = q.type || 'multiple_choice_extended';
      if (!config.questionTypes.includes(questionType)) {
        questionType = config.questionTypes[0] || 'multiple_choice_extended';
      }

      // VISUAL CONTENT GENERATION LOGIC
      let visualContent = q.visualContent;
      if (['diagram_labeling', 'chart_analysis', 'visual_interpretation'].includes(questionType)) {
        try {
          visualContent = await this.generateVisualContent(questionType, q.question, config);
        } catch (visualError) {
          logger.warn('AdvancedQuizService', 'Visual content generation failed, using text fallback', visualError);
          // Visual generation failed - question remains valid without visual content
          visualContent = undefined;
        }
      }

      // Question-specific validation
      if (questionType === 'multiple_choice_extended') {
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
          logger.warn('AdvancedQuizService', 'Invalid multiple choice options', { question: q });
          return null;
        }
        
        // Standardize correct answer format
        if (q.correctAnswer && typeof q.correctAnswer === 'string') {
          const letterMatch = q.correctAnswer.match(/^([A-Z])\)?/);
          if (letterMatch) {
            q.correctAnswer = letterMatch[1];
          }
        }
      }

      // Handle true/false questions
      if (questionType === 'true_false_explained') {
        if (typeof q.correctAnswer === 'string') {
          q.correctAnswer = q.correctAnswer.toLowerCase() === 'true';
        }
      }

      return {
        id: q.id || `adv_q_${Date.now()}_${index}`,
        type: questionType,
        question: q.question.trim(),
        subQuestions: q.subQuestions || [],
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'No explanation provided',
        visualContent: visualContent,
        metadata: {
          difficulty: Math.max(1, Math.min(5, q.metadata?.difficulty || 3)),
          categories: q.metadata?.categories || config.categories || ['General'],
          estimatedTime: Math.max(30, Math.min(600, q.metadata?.estimatedTime || 120)),
          learningObjective: q.metadata?.learningObjective || 'General understanding'
        }
      };
    } catch (error) {
      logger.warn('AdvancedQuizService', 'Failed to transform question', { question: q, error });
      return null;
    }
  }

  /**
   * VISUAL CONTENT GENERATION
   * 
   * IMPORTANT: This method only gets called for visual question types:
   * - diagram_labeling
   * - chart_analysis  
   * - visual_interpretation
   * 
   * Calls the ai-visual-quiz-generator Supabase Edge Function
   * Falls back gracefully if visual generation fails
   * 
   * @param questionType - Type of visual question
   * @param questionText - The question text for context
   * @param config - Quiz configuration
   * @returns Visual content object or throws error for fallback handling
   */
  private static async generateVisualContent(questionType: AdvancedQuestionType, questionText: string, config: AdvancedQuizConfig) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-visual-quiz-generator', {
        body: {
          questionType,
          subject: config.categories.length > 0 ? config.categories[0] : 'General',
          context: questionText,
          specificPrompt: this.createVisualPrompt(questionType, questionText, config)
        }
      });

      if (error) {
        throw new Error(`Visual content generation failed: ${error.message}`);
      }

      if (data && data.success && data.imageBase64) {
        return {
          type: questionType === 'chart_analysis' ? 'chart' : 'diagram' as 'image' | 'chart' | 'diagram',
          data: data.imageBase64,
          description: data.imageDescription || 'Generated visual content'
        };
      }

      throw new Error('No visual content generated');
    } catch (error) {
      logger.error('AdvancedQuizService', 'Visual content generation error', error);
      throw error;
    }
  }

  /**
   * Creates specific prompts for visual content generation
   * Tailored to each visual question type
   */
  private static createVisualPrompt(questionType: AdvancedQuestionType, questionText: string, config: AdvancedQuizConfig): string {
    const subject = config.categories.length > 0 ? config.categories[0] : 'educational';
    
    switch (questionType) {
      case 'diagram_labeling':
        return `Create a clear, educational diagram for ${subject} that shows labeled components related to: ${questionText}. The diagram should have clear, readable labels and be suitable for students to identify and learn from.`;
      
      case 'chart_analysis':
        return `Create a professional chart or graph for ${subject} with clear data visualization related to: ${questionText}. Include proper axes labels, legend, and data that students can analyze and interpret.`;
      
      case 'visual_interpretation':
        return `Create an educational infographic or visual representation for ${subject} related to: ${questionText}. The visual should be informative and help students understand key concepts through visual elements.`;
      
      default:
        return `Create an educational visual aid for ${subject} related to: ${questionText}`;
    }
  }

  /**
   * DATABASE: Save quiz session to Supabase
   * Handles the conversion between app format and database format
   */
  static async saveAdvancedQuizSession(session: Omit<AdvancedQuizSession, 'id' | 'created_at'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('advanced_quiz_sessions')
        .insert({
          user_id: session.user_id,
          file_id: session.file_id,
          note_id: session.note_id,
          config: session.config as any,
          questions: session.questions as any,
          answers: session.answers as any,
          score: session.score,
          detailed_results: session.detailedResults as any,
          time_spent_minutes: session.time_spent_minutes,
          completed: session.completed,
          ai_service: session.ai_service,
          model_used: session.model_used,
          completed_at: session.completed_at
        })
        .select('id')
        .single();

      if (error) {
        logger.error('AdvancedQuizService', 'Failed to save advanced quiz session', error);
        throw error;
      }

      logger.info('AdvancedQuizService', 'Advanced quiz session saved', { sessionId: data.id });
      return data.id;
    } catch (error) {
      logger.error('AdvancedQuizService', 'Error saving advanced quiz session', error);
      throw error;
    }
  }

  /**
   * DATABASE: Retrieve quiz history for user
   */
  static async getAdvancedQuizHistory(userId: string, limit: number = 10): Promise<AdvancedQuizSession[]> {
    try {
      const { data, error } = await supabase
        .from('advanced_quiz_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('AdvancedQuizService', 'Failed to fetch advanced quiz history', error);
        return [];
      }

      return (data || []).map((session: any) => transformDatabaseSession(session));
    } catch (error) {
      logger.error('AdvancedQuizService', 'Error fetching advanced quiz history', error);
      return [];
    }
  }

  /**
   * ANALYTICS: Analyze quiz performance across multiple sessions
   * Provides insights for adaptive learning
   */
  static analyzeQuizPerformance(sessions: AdvancedQuizSession[]): QuizAnalytics {
    if (sessions.length === 0) {
      return {
        strengths: [],
        weaknesses: [],
        recommendedTopics: [],
        overallProgress: 0,
        categoryBreakdown: {}
      };
    }

    const categoryScores: Record<string, { scores: number[], times: number[], count: number }> = {};
    let totalScore = 0;

    sessions.forEach(session => {
      totalScore += session.score;
      
      Object.entries(session.detailedResults.categoryScores).forEach(([category, score]) => {
        if (!categoryScores[category]) {
          categoryScores[category] = { scores: [], times: [], count: 0 };
        }
        categoryScores[category].scores.push(score);
        categoryScores[category].count++;
      });
    });

    const categoryBreakdown: Record<string, any> = {};
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    Object.entries(categoryScores).forEach(([category, data]) => {
      const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      const avgTime = data.times.length > 0 ? data.times.reduce((a, b) => a + b, 0) / data.times.length : 0;
      
      categoryBreakdown[category] = {
        score: avgScore,
        questionsAnswered: data.count,
        averageTime: avgTime
      };

      if (avgScore >= 80) strengths.push(category);
      if (avgScore < 60) weaknesses.push(category);
    });

    return {
      strengths,
      weaknesses,
      recommendedTopics: weaknesses.slice(0, 3),
      overallProgress: totalScore / sessions.length,
      categoryBreakdown
    };
  }
}
