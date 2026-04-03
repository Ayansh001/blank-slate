import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Brain, Eye, EyeOff } from 'lucide-react';
import { FlashcardExplorationDialog } from './FlashcardExplorationDialog';
import { FlashcardContentGenerator } from '../services/FlashcardContentGenerator';

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

interface SmartFlashcardsProps {
  conceptName: string;
  conceptData: {
    explanation: string;
    keyPoints: string[];
    studyTips: string[];
    examples: string[];
    flashcardSummaries?: Array<{
      id: string;
      shortSummary: string;
      comprehensiveExplanation: string;
    }>;
  };
}

export function SmartFlashcards({ conceptName, conceptData }: SmartFlashcardsProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showShortSummary, setShowShortSummary] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    mastered: 0
  });
  const [studyMode, setStudyMode] = useState<'sequential' | 'adaptive'>('sequential');

  useEffect(() => {
    const generateFlashcards = (): Flashcard[] => {
      const cards: Flashcard[] = [];

      // Core concept card with improved content generation
      const mainCardId = `concept-main-${conceptName}`;
      const mainSummary = conceptData.flashcardSummaries?.find(s => s.id === mainCardId);
      const mainContent = FlashcardContentGenerator.generateContentPair(
        conceptData.explanation, 
        'concept', 
        conceptName
      );
      
      cards.push({
        id: mainCardId,
        front: mainContent.front,
        back: mainContent.back,
        category: 'concept',
        difficulty: 'medium',
        tags: ['core', 'definition'],
        details: conceptData.explanation,
        relatedConcepts: [], // Will be populated later
        correctCount: 0,
        incorrectCount: 0,
        confidenceLevel: 1,
        shortSummary: mainSummary?.shortSummary || `${conceptName} is a fundamental concept with multiple applications and connections to related topics.`,
        comprehensiveExplanation: mainSummary?.comprehensiveExplanation
      });

      // Key points cards with enhanced content
      conceptData.keyPoints.forEach((point, index) => {
        const cardId = `keypoint-${index}-${conceptName}`;
        const cardSummary = conceptData.flashcardSummaries?.find(s => s.id === cardId);
        const keyPointContent = FlashcardContentGenerator.generateContentPair(
          point, 
          'keypoint', 
          conceptName
        );
        
        cards.push({
          id: cardId,
          front: keyPointContent.front,
          back: keyPointContent.back,
          category: 'definition',
          difficulty: 'medium',
          tags: ['key-point', 'important'],
          details: point,
          relatedConcepts: [], // Will be populated later
          correctCount: 0,
          incorrectCount: 0,
          confidenceLevel: 1,
          shortSummary: cardSummary?.shortSummary || `This key point highlights an essential aspect of ${conceptName} that builds understanding.`,
          comprehensiveExplanation: cardSummary?.comprehensiveExplanation
        });
      });

      // Example cards with focused content
      conceptData.examples.forEach((example, index) => {
        const cardId = `example-${index}-${conceptName}`;
        const cardSummary = conceptData.flashcardSummaries?.find(s => s.id === cardId);
        const exampleContent = FlashcardContentGenerator.generateContentPair(
          example, 
          'example', 
          conceptName
        );
        
        cards.push({
          id: cardId,
          front: exampleContent.front,
          back: exampleContent.back,
          category: 'example',
          difficulty: 'hard',
          tags: ['example', 'practical'],
          details: example,
          relatedConcepts: [], // Will be populated later
          correctCount: 0,
          incorrectCount: 0,
          confidenceLevel: 1,
          shortSummary: cardSummary?.shortSummary || `This example demonstrates practical application of ${conceptName} in real scenarios.`,
          comprehensiveExplanation: cardSummary?.comprehensiveExplanation
        });
      });

      // Study tip cards with improved extraction
      conceptData.studyTips.forEach((tip, index) => {
        const cardId = `tip-${index}-${conceptName}`;
        const cardSummary = conceptData.flashcardSummaries?.find(s => s.id === cardId);
        const tipContent = FlashcardContentGenerator.generateContentPair(
          tip, 
          'tip', 
          conceptName
        );
        
        cards.push({
          id: cardId,
          front: tipContent.front,
          back: tipContent.back,
          category: 'application',
          difficulty: 'easy',
          tags: ['study', 'strategy'],
          details: tip,
          relatedConcepts: [], // Will be populated later
          correctCount: 0,
          incorrectCount: 0,
          confidenceLevel: 1,
          shortSummary: cardSummary?.shortSummary || `This study strategy helps optimize learning and retention of ${conceptName}.`,
          comprehensiveExplanation: cardSummary?.comprehensiveExplanation
        });
      });

      // Generate unique related concepts for each card AFTER all cards are created
      cards.forEach(card => {
        card.relatedConcepts = FlashcardContentGenerator.generateUniqueRelatedConcepts(
          card, 
          cards, 
          conceptName
        );
      });

      return cards;
    };

    setFlashcards(generateFlashcards());
    setCurrentIndex(0);
    setShowAnswer(false);
    setShowShortSummary(false);
    setSessionStats({ studied: 0, mastered: 0 });
  }, [conceptName, conceptData]);

  const getCurrentCard = () => flashcards[currentIndex];

  const handleCardClick = () => {
    if (!showAnswer && !showShortSummary) {
      // First click: show answer
      setShowAnswer(true);
      setShowShortSummary(false);
      
      // Track as studied when answer is revealed
      const card = getCurrentCard();
      if (card) {
        setSessionStats(prev => ({ 
          ...prev, 
          studied: Math.max(prev.studied, currentIndex + 1)
        }));
      }
    } else if (showAnswer && !showShortSummary && getCurrentCard()?.shortSummary) {
      // Second click: show summary if available
      setShowShortSummary(true);
      setShowAnswer(false);
    } else {
      // Third click or if no summary: reset to front
      setShowAnswer(false);
      setShowShortSummary(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'concept': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'definition': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'example': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'application': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const nextCard = () => {
    setShowAnswer(false);
    setShowShortSummary(false);
    if (studyMode === 'adaptive') {
      const lowConfidenceCards = flashcards
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card.confidenceLevel < 3)
        .sort(() => Math.random() - 0.5);
      
      if (lowConfidenceCards.length > 0) {
        setCurrentIndex(lowConfidenceCards[0].index);
      } else {
        setCurrentIndex((prev) => (prev + 1) % flashcards.length);
      }
    } else {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }
  };

  const prevCard = () => {
    setShowAnswer(false);
    setShowShortSummary(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
    setShowShortSummary(false);
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setShowShortSummary(false);
    setSessionStats({ studied: 0, mastered: 0 });
  };

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Generating enhanced flashcards...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentCard = getCurrentCard();
  const progressPercentage = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Smart Flashcards: {conceptName}
        </CardTitle>
        <CardDescription>
          Interactive learning with layered content - click cards to reveal answers, summaries, and deep exploration
        </CardDescription>
        
        <div className="flex gap-2 mt-2">
          <Button
            variant={studyMode === 'sequential' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStudyMode('sequential')}
          >
            Sequential
          </Button>
          <Button
            variant={studyMode === 'adaptive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStudyMode('adaptive')}
          >
            Adaptive
          </Button>
          <Button variant="outline" size="sm" onClick={shuffleCards}>
            <Shuffle className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetSession}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress and Stats */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Card {currentIndex + 1} of {flashcards.length}</span>
            <span>{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-primary">{sessionStats.studied}</div>
              <div className="text-muted-foreground">Studied</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-600">{sessionStats.mastered}</div>
              <div className="text-muted-foreground">Mastered</div>
            </div>
          </div>
        </div>

        {/* Enhanced Flashcard with clear visual states */}
        <div className="relative">
          <div 
            className={`min-h-[280px] p-8 rounded-xl border-2 cursor-pointer transition-all duration-500 ${
              showShortSummary
                ? 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800'
                : showAnswer
                ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg'
            }`}
            onClick={handleCardClick}
          >
            {/* Category and difficulty indicators */}
            <div className="flex items-center justify-between mb-4">
              <Badge className={getCategoryColor(currentCard.category)}>
                {currentCard.category}
              </Badge>
              <Badge variant="outline" className={getDifficultyColor(currentCard.difficulty)}>
                {currentCard.difficulty}
              </Badge>
            </div>

            {/* Card content with distinct states */}
            <div className="text-center space-y-4">
              {showShortSummary ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Quick Insight</span>
                  </div>
                  <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">
                    {currentCard.shortSummary}
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Click to explore deeper or cycle back to question
                  </p>
                </>
              ) : showAnswer ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <EyeOff className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Answer</span>
                  </div>
                  <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 mb-6">
                    {currentCard.back}
                  </p>
                  
                  {/* Exploration button */}
                  <FlashcardExplorationDialog 
                    currentCard={currentCard}
                    conceptName={conceptName}
                    allCards={flashcards}
                  />
                  
                  {currentCard.shortSummary && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Click for quick insight or explore deeper
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Question</span>
                  </div>
                  <p className="text-xl leading-relaxed text-gray-800 dark:text-gray-200 font-medium">
                    {currentCard.front}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-6 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Click to reveal answer</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Only */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevCard}
            disabled={flashcards.length <= 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={nextCard}
            disabled={flashcards.length <= 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
