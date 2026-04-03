
export interface NormalizedQuizQuestion {
  question: string;
  options?: string[];
  correct_answer: string;
  user_answer?: string;
  explanation?: string;
  difficulty?: string;
  category?: string;
}

export interface NormalizedQuizData {
  questions: NormalizedQuizQuestion[];
  userAnswers: string[];
  score: number;
  timeSpent: number;
}

export class QuizDataNormalizer {
  static normalizeQuizData(record: any): NormalizedQuizData | null {
    try {
      if (!record) return null;

      const questions = this.normalizeQuestions(record.questions);
      const userAnswers = this.normalizeUserAnswers(record.answers);
      
      return {
        questions,
        userAnswers,
        score: record.score || 0,
        timeSpent: record.time_spent_minutes || 0
      };
    } catch (error) {
      console.error('Error normalizing quiz data:', error);
      return null;
    }
  }

  private static normalizeQuestions(questionsData: any): NormalizedQuizQuestion[] {
    if (!questionsData) return [];

    try {
      // Handle different question data structures
      let questionsList: any[] = [];
      
      if (Array.isArray(questionsData)) {
        questionsList = questionsData;
      } else if (questionsData.questions && Array.isArray(questionsData.questions)) {
        questionsList = questionsData.questions;
      } else if (typeof questionsData === 'object' && questionsData.data) {
        questionsList = Array.isArray(questionsData.data) ? questionsData.data : [];
      }

      return questionsList.map((q, index) => this.normalizeQuestion(q, index));
    } catch (error) {
      console.error('Error normalizing questions:', error);
      return [];
    }
  }

  private static normalizeQuestion(question: any, index: number): NormalizedQuizQuestion {
    if (!question) {
      return {
        question: `Question ${index + 1} (data unavailable)`,
        correct_answer: 'Unknown'
      };
    }

    // Handle different correct answer property names - use ?? instead of || to preserve false values
    let correctAnswer = question.correct_answer ?? 
                       question.correctAnswer ?? 
                       question.answer ?? 
                       question.correct ??
                       'Unknown';

    // Ensure correct answer is a string
    if (typeof correctAnswer !== 'string') {
      correctAnswer = String(correctAnswer);
    }

    return {
      question: question.question || question.text || `Question ${index + 1}`,
      options: Array.isArray(question.options) ? question.options : undefined,
      correct_answer: correctAnswer,
      explanation: question.explanation || question.rationale,
      difficulty: question.difficulty,
      category: question.category || question.topic
    };
  }

  private static normalizeUserAnswers(answersData: any): string[] {
    try {
      if (!answersData) return [];

      // Handle different answer structures - use ?? instead of || to preserve false values
      if (Array.isArray(answersData)) {
        return answersData.map(answer => String(answer ?? 'Not answered'));
      }

      if (answersData.answers && Array.isArray(answersData.answers)) {
        return answersData.answers.map(answer => String(answer ?? 'Not answered'));
      }

      if (typeof answersData === 'object') {
        // Handle object with numeric keys
        const keys = Object.keys(answersData).sort((a, b) => Number(a) - Number(b));
        return keys.map(key => String(answersData[key] ?? 'Not answered'));
      }

      return [];
    } catch (error) {
      console.error('Error normalizing user answers:', error);
      return [];
    }
  }

  static isAnswerCorrect(userAnswer: string, correctAnswer: string): boolean {
    if (!userAnswer || !correctAnswer) return false;
    
    const normalizeAnswer = (answer: string): string => {
      return answer.toString().toLowerCase().trim();
    };

    return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
  }
}
