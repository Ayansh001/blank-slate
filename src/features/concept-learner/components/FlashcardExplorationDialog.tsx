
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Brain, Lightbulb, Target, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface RelatedConcept {
  name: string;
  relationship: string;
  explanation: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: 'concept' | 'definition' | 'example' | 'application';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  details: string;
  relatedConcepts: RelatedConcept[];
  correctCount: number;
  incorrectCount: number;
  confidenceLevel: number;
  shortSummary?: string;
  comprehensiveExplanation?: string;
}

interface FlashcardExplorationDialogProps {
  currentCard: Flashcard;
  conceptName: string;
  allCards: Flashcard[];
}

interface ExplorationContent {
  deeperInsights: string[];
  connectionPoints: RelatedConcept[];
  studyStrategies: string[];
  cognitiveConnections: string[];
  progressionPath: Array<{
    level: string;
    focus: string;
  }>;
}

export function FlashcardExplorationDialog({ currentCard, conceptName, allCards }: FlashcardExplorationDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const explorationContent = useMemo(() => {
    return generateExplorationContent(currentCard, conceptName, allCards);
  }, [currentCard, conceptName, allCards]);

  const hasCachedExplanation = !!currentCard.comprehensiveExplanation;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4 group hover:bg-primary/5"
          onClick={(e) => e.stopPropagation()}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Explore Deeper
          <ArrowRight className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="h-6 w-6 text-primary" />
            Deep Exploration: {getCategoryDisplayName(currentCard.category)}
          </DialogTitle>
          <DialogDescription className="text-base">
            Comprehensive insights and connections for mastering this aspect of {conceptName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8">
          {/* Card Context - Minimal, focused */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">
                {currentCard.category} • {currentCard.difficulty}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Focus Area
              </Badge>
            </div>
            <h4 className="font-semibold text-lg mb-2">{currentCard.front}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Understanding this {currentCard.category} is key to building comprehensive knowledge of {conceptName}
            </p>
          </div>

          {/* Deeper Insights */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Deeper Insights
            </h3>
            <div className="space-y-3">
              {explorationContent.deeperInsights.map((insight, index) => (
                <div key={index} className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border-l-4 border-yellow-400">
                  <p className="text-sm leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Points - Now using actual related concepts from cards */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              Knowledge Connections
            </h3>
            <div className="grid gap-4">
              {explorationContent.connectionPoints.map((connection, index) => (
                <div key={index} className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{connection.name}</span>
                    <Badge variant="secondary" className="text-xs">{connection.relationship}</Badge>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{connection.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Study Strategies */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Targeted Study Strategies
            </h3>
            <div className="space-y-3">
              {explorationContent.studyStrategies.map((strategy, index) => (
                <div key={index} className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border-l-4 border-green-400">
                  <p className="text-sm leading-relaxed">{strategy}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cognitive Connections */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Mental Models & Patterns
            </h3>
            <div className="space-y-3">
              {explorationContent.cognitiveConnections.map((connection, index) => (
                <div key={index} className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border-l-4 border-purple-400">
                  <p className="text-sm leading-relaxed">{connection}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Progression */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Learning Progression Path
            </h3>
            <div className="space-y-2">
              {explorationContent.progressionPath.map((step, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                  <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-700 dark:text-indigo-300">{step.level}</div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400">{step.focus}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getCategoryDisplayName(category: string): string {
  const displayNames = {
    concept: 'Core Concept',
    definition: 'Key Definition',
    example: 'Practical Example',
    application: 'Real-world Application'
  };
  return displayNames[category as keyof typeof displayNames] || category;
}

function generateExplorationContent(
  currentCard: Flashcard, 
  conceptName: string, 
  allCards: Flashcard[]
): ExplorationContent {
  const categoryInsights = {
    concept: {
      insights: [
        `This foundational concept of ${conceptName} serves as a building block for more advanced understanding`,
        `Mastering this concept enables you to recognize patterns and applications across different contexts`,
        `The interconnected nature of this concept means it influences how you understand related topics`
      ],
      strategies: [
        `Create visual diagrams connecting this concept to its applications and examples`,
        `Practice explaining this concept in your own words to different audiences`,
        `Look for this concept in everyday situations to strengthen your understanding`
      ]
    },
    definition: {
      insights: [
        `This precise definition helps distinguish ${conceptName} from similar concepts`,
        `Understanding the nuances in this definition prevents common misconceptions`,
        `This definition provides the vocabulary needed for advanced discussions`
      ],
      strategies: [
        `Memorize key terms and practice using them in context`,
        `Compare this definition with related terms to understand distinctions`,
        `Create mnemonics or acronyms to remember important components`
      ]
    },
    example: {
      insights: [
        `This example demonstrates how ${conceptName} manifests in real-world scenarios`,
        `Analyzing this example reveals the practical implications of theoretical knowledge`,
        `This concrete instance helps bridge abstract concepts with tangible applications`
      ],
      strategies: [
        `Identify the key principles this example illustrates`,
        `Generate additional examples following the same pattern`,
        `Practice recognizing similar patterns in new contexts`
      ]
    },
    application: {
      insights: [
        `This application shows the practical value and utility of ${conceptName}`,
        `Understanding this use case helps prioritize which aspects are most important`,
        `This application reveals how ${conceptName} solves real problems`
      ],
      strategies: [
        `Practice applying this technique to similar problems`,
        `Identify the conditions where this application is most effective`,
        `Consider limitations and alternative approaches`
      ]
    }
  };

  const category = currentCard.category;
  const categoryData = categoryInsights[category];

  // Use the actual related concepts from the current card (which now have rich data)
  const connectionPoints = currentCard.relatedConcepts || [];

  const cognitiveConnections = [
    `This ${category} connects to your existing knowledge through pattern recognition and conceptual mapping`,
    `Building understanding requires connecting this information to multiple memory pathways and associations`,
    `Effective learning involves both analytical understanding and intuitive grasp of this ${category}`
  ];

  const progressionPath = [
    { level: 'Foundation', focus: `Understand the basic meaning and context of this ${category}` },
    { level: 'Application', focus: `Practice using this knowledge in different scenarios` },
    { level: 'Integration', focus: `Connect with other concepts and build comprehensive understanding` },
    { level: 'Mastery', focus: `Teach others and apply creatively in novel situations` }
  ];

  return {
    deeperInsights: categoryData.insights,
    connectionPoints,
    studyStrategies: categoryData.strategies,
    cognitiveConnections,
    progressionPath
  };
}
