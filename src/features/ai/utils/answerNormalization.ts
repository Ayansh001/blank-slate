
import { AdvancedQuestionType } from '../types/advancedQuiz';

export type QuestionType = AdvancedQuestionType;

export class AnswerNormalizer {
  /**
   * Normalize user answers for consistent comparison
   */
  static normalizeAnswer(answer: any, questionType: QuestionType): any {
    if (answer === null || answer === undefined) {
      return null;
    }

    switch (questionType) {
      case 'multiple_choice_extended':
        return this.normalizeMultipleChoice(answer);
      
      case 'true_false_explained':
        return this.normalizeTrueFalse(answer);
      
      case 'essay_short':
      case 'scenario_based':
      case 'visual_interpretation':
      case 'chart_analysis':
      case 'comparison':
        return this.normalizeText(answer);
      
      case 'multi_part':
        return this.normalizeMultiPart(answer);
      
      default:
        return answer;
    }
  }

  /**
   * Normalize user answer - alias for backward compatibility
   */
  static normalizeUserAnswer(answer: any, questionType: QuestionType): any {
    return this.normalizeAnswer(answer, questionType);
  }

  /**
   * Normalize correct answer - specific handling for correct answers
   */
  static normalizeCorrectAnswer(answer: any, questionType: QuestionType): any {
    return this.normalizeAnswer(answer, questionType);
  }

  /**
   * Normalize multiple choice answer specifically
   */
  static normalizeMultipleChoiceAnswer(answer: any): string | number | null {
    return this.normalizeMultipleChoice(answer);
  }

  /**
   * Compare user answer with correct answer
   */
  static compareAnswers(userAnswer: any, correctAnswer: any, questionType: QuestionType): boolean {
    const normalizedUser = this.normalizeAnswer(userAnswer, questionType);
    const normalizedCorrect = this.normalizeAnswer(correctAnswer, questionType);

    if (normalizedUser === null || normalizedUser === undefined) {
      return false;
    }

    switch (questionType) {
      case 'multiple_choice_extended':
        return this.compareMultipleChoice(normalizedUser, normalizedCorrect);
      
      case 'true_false_explained':
        return normalizedUser === normalizedCorrect;
      
      case 'essay_short':
      case 'scenario_based':
      case 'visual_interpretation':
      case 'chart_analysis':
      case 'comparison':
        return this.compareText(normalizedUser, normalizedCorrect);
      
      case 'multi_part':
        return this.compareMultiPart(normalizedUser, normalizedCorrect);
      
      default:
        return normalizedUser === normalizedCorrect;
    }
  }

  /**
   * Format answer for display in results
   */
  static formatAnswerForDisplay(answer: any, question: any): string {
    if (answer === null || answer === undefined) {
      return 'Not answered';
    }

    switch (question.type) {
      case 'multiple_choice_extended':
        if (question.options && typeof answer === 'string') {
          const option = question.options.find((opt: string) => opt.startsWith(answer));
          return option || answer;
        }
        return String(answer);
      
      case 'true_false_explained':
        return answer === true ? 'True' : answer === false ? 'False' : String(answer);
      
      case 'multi_part':
        if (Array.isArray(answer)) {
          return answer.map((a, i) => `${i + 1}. ${a}`).join('\n');
        }
        return String(answer);
      
      default:
        return String(answer);
    }
  }

  private static normalizeMultipleChoice(answer: any): string | number | null {
    if (typeof answer === 'string') {
      // Handle "A", "B", "C", "D" format
      const match = answer.match(/^([A-D])\)/);
      if (match) {
        return match[1];
      }
      // Handle direct letter
      if (/^[A-D]$/.test(answer)) {
        return answer;
      }
      return answer.trim();
    }
    
    if (typeof answer === 'number') {
      return answer;
    }
    
    return null;
  }

  private static normalizeTrueFalse(answer: any): boolean | null {
    if (typeof answer === 'boolean') {
      return answer;
    }
    
    if (typeof answer === 'string') {
      const normalized = answer.toLowerCase().trim();
      if (normalized === 'true' || normalized === 't' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === 'f' || normalized === '0') {
        return false;
      }
    }
    
    return null;
  }

  private static normalizeText(answer: any): string {
    if (typeof answer !== 'string') {
      return String(answer || '');
    }
    
    return answer.trim().toLowerCase();
  }

  private static normalizeMultiPart(answer: any): string[] {
    if (Array.isArray(answer)) {
      return answer.map(a => this.normalizeText(a));
    }
    
    return [];
  }

  private static compareMultipleChoice(userAnswer: any, correctAnswer: any): boolean {
    // Convert both to comparable format
    const userNorm = String(userAnswer).toUpperCase().trim();
    const correctNorm = String(correctAnswer).toUpperCase().trim();
    
    // Direct comparison
    if (userNorm === correctNorm) {
      return true;
    }
    
    // Handle index vs letter comparison (0 = A, 1 = B, etc.)
    if (typeof userAnswer === 'number' && typeof correctAnswer === 'string') {
      const letters = ['A', 'B', 'C', 'D'];
      return letters[userAnswer] === correctNorm;
    }
    
    if (typeof userAnswer === 'string' && typeof correctAnswer === 'number') {
      const letters = ['A', 'B', 'C', 'D'];
      return userNorm === letters[correctAnswer];
    }
    
    return false;
  }

  private static compareText(userAnswer: string, correctAnswer: string): boolean {
    // For text questions, we can implement more sophisticated comparison
    // For now, simple containment check
    if (userAnswer.length < 10) {
      return userAnswer === correctAnswer;
    }
    
    // For longer answers, check if key terms are present
    const correctWords = correctAnswer.split(' ').filter(word => word.length > 3);
    const userWords = userAnswer.split(' ');
    
    const matchedWords = correctWords.filter(word => 
      userWords.some(userWord => userWord.includes(word))
    );
    
    // Consider correct if at least 60% of key terms are present
    return matchedWords.length / correctWords.length >= 0.6;
  }

  private static compareMultiPart(userAnswers: string[], correctAnswers: string[]): boolean {
    if (userAnswers.length !== correctAnswers.length) {
      return false;
    }
    
    return userAnswers.every((answer, index) => 
      this.compareText(answer, correctAnswers[index])
    );
  }

  /**
   * Calculate partial score for essay-type questions
   */
  static calculatePartialScore(userAnswer: any, correctAnswer: any, questionType: QuestionType): number {
    if (this.compareAnswers(userAnswer, correctAnswer, questionType)) {
      return 1.0;
    }
    
    if (questionType === 'essay_short' || questionType === 'scenario_based') {
      const userText = this.normalizeText(userAnswer);
      const correctText = this.normalizeText(correctAnswer);
      
      if (userText.length === 0) {
        return 0;
      }
      
      const correctWords = correctText.split(' ').filter(word => word.length > 3);
      const userWords = userText.split(' ');
      
      const matchedWords = correctWords.filter(word => 
        userWords.some(userWord => userWord.includes(word))
      );
      
      return Math.min(matchedWords.length / correctWords.length, 1.0);
    }
    
    return 0;
  }
}
