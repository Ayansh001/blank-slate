
export interface AdvancedQuizConfig {
  contentType: 'text' | 'visual' | 'mixed';
  questionTypes: AdvancedQuestionType[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  questionCount: number;
  questionDepth: 'shallow' | 'medium' | 'deep';
  categories: string[];
  customKeywords: string[];
  includeExplanations: boolean;
  enableMultiPart: boolean;
  visualContentSupport: boolean;
}

export type AdvancedQuestionType = 
  | 'multiple_choice_extended'
  | 'true_false_explained'
  | 'scenario_based'
  | 'visual_interpretation'
  | 'multi_part'
  | 'diagram_labeling'
  | 'chart_analysis'
  | 'comparison'
  | 'essay_short';

export interface AdvancedQuestion {
  id: string;
  type: AdvancedQuestionType;
  question: string;
  subQuestions?: string[];
  options?: string[];
  correctAnswer: any;
  explanation: string;
  visualContent?: {
    type: 'image' | 'chart' | 'diagram';
    url?: string;
    data?: any;
    description?: string;
  };
  metadata: {
    difficulty: number;
    categories: string[];
    estimatedTime: number;
    learningObjective: string;
  };
}

export interface AdvancedQuizSession {
  id: string;
  user_id: string;
  file_id?: string;
  note_id?: string;
  config: AdvancedQuizConfig;
  questions: AdvancedQuestion[];
  answers: any[];
  score: number;
  detailedResults: {
    categoryScores: Record<string, number>;
    timePerQuestion: number[];
    difficultyProgress: number[];
  };
  time_spent_minutes: number;
  completed: boolean;
  ai_service: string;
  model_used: string;
  created_at: string;
  completed_at?: string;
}

export interface QuizAnalytics {
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  overallProgress: number;
  categoryBreakdown: Record<string, {
    score: number;
    questionsAnswered: number;
    averageTime: number;
  }>;
}
