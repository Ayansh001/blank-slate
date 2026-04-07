import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Loader2 } from 'lucide-react';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { AIServiceProvider } from '@/features/ai/types';
import { useConceptLearner } from '../hooks/useConceptLearner';
import { HierarchicalKnowledgeGraph } from './HierarchicalKnowledgeGraph';
import { SmartFlashcards } from './SmartFlashcards';
import { InteractiveMindMap } from './InteractiveMindMap';
import { IntelligentVideoPlayer } from './IntelligentVideoPlayer';
import { SmartTextHighlighter } from './SmartTextHighlighter';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';

interface EnhancedConceptLearnerProps {
  initialConcept?: string;
  provider?: 'openai' | 'gemini';
}

export function EnhancedConceptLearner({ 
  initialConcept = '', 
  provider = 'gemini' 
}: EnhancedConceptLearnerProps) {
  const [concept, setConcept] = useState(initialConcept);
  const { isLoading, conceptData, learnConcept, actualProvider, useOpenAIFrontend } = useConceptLearner();
  const { activeConfig } = useAIConfig();

  // The concept learner is ready if there's an active AI config with an API key
  const isReady = !!(activeConfig && activeConfig.api_key);

  const handleLearnConcept = async () => {
    if (!isLoading && concept.trim()) {
      await learnConcept(concept, provider);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && concept.trim()) {
      e.preventDefault();
      handleLearnConcept();
    }
  };

  const exploreRelatedConcept = (relatedConcept: string) => {
    setConcept(relatedConcept);
    learnConcept(relatedConcept, provider);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Enhanced Concept Learner
            <Badge variant="outline" className="ml-2 flex items-center gap-1.5">
              <AIProviderLogo 
                provider={(conceptData ? actualProvider : provider) as AIServiceProvider} 
                size="sm" 
              />
              <span className="text-xs">
                {(conceptData ? actualProvider : provider) === 'gemini' ? 'Gemini 2.0' : 'GPT-4o'}
                {useOpenAIFrontend && ' (Frontend)'}
              </span>
            </Badge>
          </CardTitle>
          <CardDescription>
            Advanced AI-powered learning with interactive features, smart highlighting, and adaptive flashcards
            {!isReady && (
              <span className="block mt-2 text-orange-600 text-sm">
                ⚠️ Please configure your AI service in Settings to use the concept learner
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a concept to learn (e.g., Machine Learning, Photosynthesis, Democracy)"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button 
              onClick={handleLearnConcept} 
              disabled={!concept.trim() || isLoading || !isReady}
              className="min-w-[100px]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Learn'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Learning Interface */}
      {conceptData && (
        <div className="space-y-6">
          <Tabs defaultValue="explanation" className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-2 bg-muted/50">
              <TabsTrigger value="explanation" className="text-xs sm:text-sm px-2 py-1.5">📘 Smart Text</TabsTrigger>
              <TabsTrigger value="mindmap" className="text-xs sm:text-sm px-2 py-1.5">🗺️ Mind Map</TabsTrigger>
              <TabsTrigger value="graph" className="text-xs sm:text-sm px-2 py-1.5">🌐 Knowledge Graph</TabsTrigger>
              <TabsTrigger value="flashcards" className="text-xs sm:text-sm px-2 py-1.5">🧠 Flashcards</TabsTrigger>
              <TabsTrigger value="videos" className="text-xs sm:text-sm px-2 py-1.5">🎥 Videos</TabsTrigger>
              <TabsTrigger value="examples" className="text-xs sm:text-sm px-2 py-1.5">📚 Examples</TabsTrigger>
            </TabsList>

            <TabsContent value="explanation">
              <SmartTextHighlighter
                content={conceptData.explanation}
                conceptName={conceptData.concept}
              />
            </TabsContent>

            <TabsContent value="mindmap">
              <InteractiveMindMap
                centralConcept={conceptData.concept}
                initialBranches={conceptData.mindMap.branches}
              />
            </TabsContent>

            <TabsContent value="graph">
              <HierarchicalKnowledgeGraph
                centralConcept={conceptData.concept}
                nodes={[
                  { id: 'central', name: conceptData.concept, type: 'central' as const, level: 0 },
                  ...conceptData.knowledgeGraph.connectedNodes.map((node, index) => ({
                    id: `node-${index}`,
                    name: node,
                    type: 'connected' as const,
                    difficulty: (index < 2 ? 'beginner' : index < 4 ? 'intermediate' : 'advanced') as 'beginner' | 'intermediate' | 'advanced',
                    level: index < 2 ? 1 : index < 4 ? 2 : 3
                  }))
                ]}
                onNodeClick={exploreRelatedConcept}
              />
            </TabsContent>

            <TabsContent value="flashcards">
              <SmartFlashcards
                conceptName={conceptData.concept}
                conceptData={{
                  explanation: conceptData.explanation,
                  keyPoints: conceptData.keyPoints,
                  studyTips: conceptData.studyTips,
                  examples: conceptData.examples
                }}
              />
            </TabsContent>

            <TabsContent value="videos">
              {conceptData.youtubeVideos ? (
                <IntelligentVideoPlayer
                  videos={conceptData.youtubeVideos.map(video => ({
                    ...video,
                    educationalScore: Math.floor(Math.random() * 30) + 70,
                    difficultyLevel: Math.random() > 0.6 ? 'beginner' : Math.random() > 0.3 ? 'intermediate' : 'advanced' as const
                  }))}
                  conceptName={conceptData.concept}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No videos available for this concept
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="examples">
              <Card>
                <CardHeader>
                  <CardTitle>📚 Examples & Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {conceptData.examples.map((example, index) => (
                      <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-l-4 border-blue-500">
                        <div className="leading-relaxed">{example}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
