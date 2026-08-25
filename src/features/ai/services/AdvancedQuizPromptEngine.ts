
import { AdvancedQuizConfig, AdvancedQuestionType } from '../types/advancedQuiz';
import { logger } from '../utils/DebugLogger';

/**
 * AdvancedQuizPromptEngine - Generates AI prompts for advanced quiz creation
 * 
 * PURPOSE: Creates structured prompts for AI services to generate quiz questions
 * FEATURES: 
 * - Supports 9 different question types including visual and text-based
 * - Handles difficulty levels, categories, and custom keywords
 * - Enforces exact question count requirements
 * - Provides fallback strategies for visual content
 * 
 * RECENT UPDATES:
 * - Enhanced question count enforcement with explicit language
 * - Added supplementary prompt generation for retry scenarios  
 * - Improved visual content guidance for text-based fallbacks
 * - Added follow-up prompt generation for weak area reinforcement
 */
export class AdvancedQuizPromptEngine {
  /**
   * Maps question types to their specific prompt instructions
   * @param type - The question type to generate prompt for
   * @param contentType - Whether content is 'text' or other format
   * @returns Specific prompt instruction for the question type
   */
  private static getQuestionTypePrompt(type: AdvancedQuestionType, contentType: string): string {
    const prompts: Record<AdvancedQuestionType, string> = {
      multiple_choice_extended: 'Create detailed multiple choice questions with 4-5 options, including plausible distractors. Format options as "A) Option text", "B) Option text", etc.',
      true_false_explained: 'Create true/false questions with comprehensive explanations for both outcomes',
      scenario_based: 'Create realistic scenario questions that test application of knowledge in practical situations',
      
      // VISUAL QUESTION TYPES - These trigger visual content generation
      visual_interpretation: contentType === 'text' 
        ? 'Create questions that ask students to interpret described data, patterns, or relationships from the text content'
        : 'Create questions that require analysis of charts, graphs, or visual data',
      diagram_labeling: contentType === 'text'
        ? 'Create questions asking students to identify key components, parts, or elements described in the text content'
        : 'Create questions about identifying or labeling parts of diagrams/images',
      chart_analysis: contentType === 'text'
        ? 'Create questions that require interpretation of numerical data, trends, or statistical information mentioned in the text'
        : 'Create questions requiring interpretation of data charts and graphs',
      
      // TEXT-ONLY QUESTION TYPES  
      multi_part: 'Create questions with 2-3 related sub-questions that build on each other progressively',
      comparison: 'Create questions comparing concepts, data, theories, or scenarios presented in the content',
      essay_short: 'Create short-answer questions requiring 2-3 sentence responses that demonstrate understanding'
    };
    return prompts[type];
  }

  /**
   * Maps difficulty levels to AI instruction modifiers
   * Controls complexity, vocabulary, and cognitive load
   */
  private static getDifficultyModifier(difficulty: string): string {
    const modifiers: Record<string, string> = {
      beginner: 'Use simple language and focus on basic concepts and definitions. Questions should test recall and basic understanding.',
      intermediate: 'Include moderate complexity with some analysis and application. Test comprehension and ability to apply concepts.',
      advanced: 'Require critical thinking, synthesis, and deep understanding. Test analysis, evaluation, and complex reasoning.',
      expert: 'Challenge with complex scenarios, edge cases, and advanced applications. Test expertise and sophisticated reasoning.'
    };
    return modifiers[difficulty] || modifiers.intermediate;
  }

  /**
   * Maps question depth levels to cognitive complexity requirements
   * Based on Bloom's taxonomy principles
   */
  private static getDepthModifier(depth: string): string {
    const modifiers: Record<string, string> = {
      shallow: 'Focus on surface-level facts, definitions, and basic recall of information',
      medium: 'Include understanding, comprehension, and basic application of concepts',
      deep: 'Require analysis, evaluation, synthesis, and complex reasoning about the material'
    };
    return modifiers[depth] || modifiers.medium;
  }

  /**
   * Generates category-specific focus instructions
   * Helps AI align questions with specific learning objectives
   */
  private static getCategoryPrompt(categories: string[]): string {
    if (categories.length === 0) return '';
    return `Focus questions on these specific categories: ${categories.join(', ')}. Ensure questions align with these learning objectives. `;
  }

  /**
   * Incorporates custom keywords into question generation
   * Ensures important terms are featured in questions
   */
  private static getKeywordPrompt(keywords: string[]): string {
    if (keywords.length === 0) return '';
    return `Incorporate these specific keywords/concepts where relevant: ${keywords.join(', ')}. Make sure these terms are featured in questions. `;
  }

  /**
   * CRITICAL: Provides guidance for visual question types when content is text-based
   * 
   * IMPLEMENTATION NOTE: This is key to the visual/text separation logic
   * - Only provides guidance when visual question types are selected
   * - Instructs AI on how to adapt visual questions for text content
   * - Prevents generation of questions requiring actual images when none exist
   */
  private static getVisualContentGuidance(config: AdvancedQuizConfig): string {
    const hasVisualTypes = config.questionTypes.some(type => 
      ['visual_interpretation', 'diagram_labeling', 'chart_analysis'].includes(type)
    );

    if (hasVisualTypes && config.contentType === 'text') {
      return `
IMPORTANT FOR VISUAL QUESTION TYPES:
Since the content is text-based, adapt visual question types as follows:
- For diagram_labeling: Ask about components, parts, or elements mentioned in the text
- For chart_analysis: Focus on numerical data, statistics, or trends described in the text
- For visual_interpretation: Ask students to interpret relationships or patterns described textually

Do NOT generate questions that require actual diagrams or charts unless they are described in the content.`;
    }

    return '';
  }

  /**
   * MAIN PROMPT GENERATOR - Creates comprehensive AI prompt for quiz generation
   * 
   * CRITICAL FEATURES IMPLEMENTED:
   * 1. Exact question count enforcement (added in Phase 1)
   * 2. Multiple validation checkpoints
   * 3. Structured JSON output format
   * 4. Visual content handling instructions
   * 
   * @param content - The source material for quiz generation
   * @param config - Configuration object with all quiz parameters
   * @returns Formatted prompt string for AI service
   */
  static generateAdvancedPrompt(content: string, config: AdvancedQuizConfig): string {
    logger.info('AdvancedQuizPromptEngine', 'Generating advanced quiz prompt', { 
      contentLength: content.length,
      config 
    });

    const questionTypePrompts = config.questionTypes.map(type => 
      `- ${type.replace('_', ' ').toUpperCase()}: ${this.getQuestionTypePrompt(type, config.contentType)}`
    ).join('\n');

    const categoryPrompt = this.getCategoryPrompt(config.categories);
    const keywordPrompt = this.getKeywordPrompt(config.customKeywords);
    const difficultyModifier = this.getDifficultyModifier(config.difficulty);
    const depthModifier = this.getDepthModifier(config.questionDepth);
    const visualGuidance = this.getVisualContentGuidance(config);

    // ENHANCED PROMPT WITH STRICT QUESTION COUNT ENFORCEMENT (Phase 1 Implementation)
    const basePrompt = `You are an expert educator. Generate EXACTLY ${config.questionCount} questions, NO MORE, NO FEWER.

CRITICAL REQUIREMENT - READ CAREFULLY:
- You MUST generate EXACTLY ${config.questionCount} questions
- Count each question as you create it: 1, 2, 3, 4, 5...
- If you reach the end and have fewer than ${config.questionCount}, ADD MORE QUESTIONS
- If you have more than ${config.questionCount}, REMOVE THE EXCESS
- VERIFY THE COUNT before responding: you must have EXACTLY ${config.questionCount} questions

ABSOLUTE REQUIREMENT: EXACTLY ${config.questionCount} QUESTIONS - COUNT THEM!

QUESTION TYPES TO INCLUDE (distribute evenly):
${questionTypePrompts}

DIFFICULTY LEVEL: ${config.difficulty.toUpperCase()}
${difficultyModifier}

QUESTION DEPTH: ${config.questionDepth.toUpperCase()}
${depthModifier}

${categoryPrompt}${keywordPrompt}${visualGuidance}

ADVANCED REQUIREMENTS:
- Each question MUST include a detailed explanation (minimum 2-3 sentences)
- Questions should test understanding and application, not just recall
- Include metadata for difficulty estimation and learning objectives
- Use varied question formats to maintain engagement
- ${config.enableMultiPart ? 'Include multi-part questions where appropriate' : ''}
- ${config.includeExplanations ? 'Provide comprehensive explanations for all answers' : ''}
- For multiple choice: Use format "A) Option text", "B) Option text", etc.
- For true/false: Provide boolean values (true/false)
- Ensure questions are directly based on the provided content

FINAL VALIDATION CHECKLIST - VERIFY BEFORE RESPONDING:
✓ Count your questions: 1, 2, 3, 4, 5... = EXACTLY ${config.questionCount} questions
✓ All questions have proper explanations
✓ Multiple choice options formatted correctly
✓ Questions test the specified difficulty level
✓ Content coverage is comprehensive

CRITICAL: Before submitting your response, COUNT THE QUESTIONS. You MUST have EXACTLY ${config.questionCount} questions.

FORMAT YOUR RESPONSE AS VALID JSON:
{
  "questions": [
    {
      "id": "adv_q_1",
      "type": "question_type",
      "question": "Main question text",
      "subQuestions": ["sub-question 1", "sub-question 2"], // Only for multi-part
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"], // For multiple choice
      "correctAnswer": "A", // For multiple choice: just the letter. For true/false: true/false
      "explanation": "Detailed explanation of why this is correct and why other options are wrong",
      "visualContent": { // Only if applicable
        "type": "chart|diagram|image",
        "description": "Description of visual element"
      },
      "metadata": {
        "difficulty": 3,
        "categories": ["Critical Thinking"],
        "estimatedTime": 120,
        "learningObjective": "What this question tests"
      }
    }
  ]
}

CONTENT TO ANALYZE:
${content.slice(0, 5000)}${content.length > 5000 ? '\n\n[Content truncated for processing - ensure questions cover full content scope]' : ''}

FINAL VERIFICATION: You MUST generate exactly ${config.questionCount} questions. Verify the count before responding. Count them: 1, 2, 3... up to ${config.questionCount}.`;

    return basePrompt;
  }

  /**
   * SUPPLEMENTARY PROMPT GENERATOR - For retry scenarios (Phase 2 Implementation)
   * 
   * PURPOSE: When initial generation doesn't produce enough questions,
   * this generates additional questions to meet the exact count requirement.
   * 
   * FEATURES:
   * - Avoids duplicating existing question topics
   * - Uses same configuration as original request
   * - Focuses on remaining question count
   * 
   * @param content - Source material
   * @param config - Quiz configuration
   * @param additionalCount - How many more questions needed
   * @param existingQuestions - Questions already generated
   * @returns Prompt for generating additional questions
   */
  static generateSupplementaryPrompt(
    content: string, 
    config: AdvancedQuizConfig, 
    additionalCount: number,
    existingQuestions: any[]
  ): string {
    const existingTopics = existingQuestions.map(q => q.metadata?.learningObjective || q.question.slice(0, 50)).join(', ');
    
    return `Generate EXACTLY ${additionalCount} additional advanced quiz questions to supplement the existing quiz.

CRITICAL: You must generate EXACTLY ${additionalCount} questions, NO MORE, NO FEWER.
Count them as you create: 1, 2, 3... up to ${additionalCount}.

AVOID DUPLICATING these already covered topics: ${existingTopics}

Use the same configuration as before:
- Difficulty: ${config.difficulty}
- Question Types: ${config.questionTypes.join(', ')}
- Categories: ${config.categories.join(', ')}
- Content Type: ${config.contentType}

VERIFICATION BEFORE RESPONDING: Count your questions. You MUST have EXACTLY ${additionalCount} new questions.

${this.getVisualContentGuidance(config)}

CONTENT:
${content.slice(0, 3000)}

Use the same JSON format as before. VERIFY: exactly ${additionalCount} questions.`;
  }

  /**
   * FOLLOW-UP PROMPT GENERATOR - For reinforcement learning scenarios
   * 
   * PURPOSE: Creates targeted questions based on previous quiz performance
   * to help students improve in weak areas.
   * 
   * @param previousQuestions - Questions from previous attempts
   * @param weakAreas - Areas where student performed poorly
   * @returns Prompt for generating follow-up questions
   */
  static generateFollowUpPrompt(previousQuestions: any[], weakAreas: string[]): string {
    return `Based on the previous quiz performance, create follow-up questions focusing on these weak areas: ${weakAreas.join(', ')}.
    
Make the questions slightly easier but still challenging, with extra detailed explanations to help reinforce learning.
    
Previous question topics covered: ${previousQuestions.map(q => q.metadata?.learningObjective || 'General').join(', ')}

Use the same JSON format as before with proper answer formatting.`;
  }
}
