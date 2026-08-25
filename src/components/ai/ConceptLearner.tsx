import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Brain, Lightbulb, MessageSquare, Map, Network, Video, Target, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';

interface ConceptLearnerProps {
  initialConcept?: string;
}

interface ConceptExplanation {
  concept?: string;
  explanation?: string;
  definition?: string;
  keyPoints: string[];
  examples: string[];
  relatedConcepts: Array<{
    name: string;
    relationship: string;
  }>;
  practicalApplications?: string[];
  studyTips: string[];
  mindMap?: {
    center: string;
    branches: Array<{
      topic: string;
      subtopics: string[];
    }>;
  };
  knowledgeGraph?: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      relationship: string;
    }>;
  };
  youtubeVideos?: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
    description: string;
    url: string;
  }>;
}

export function ConceptLearner({ initialConcept = '' }: ConceptLearnerProps) {
  const { user } = useAuth();
  const [concept, setConcept] = useState(initialConcept);
  const [explanation, setExplanation] = useState<ConceptExplanation | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);

  const learnConcept = async () => {
    if (!concept.trim() || !user) {
      toast.error('Please enter a concept to learn');
      return;
    }
    
    setIsLearning(true);
    try {
      // Check active AI service to determine which handler to use
      let handlerEndpoint = 'concept-learner-handler'; // Default fallback
      let isOpenAI = false;
      
      try {
        const { data: activeConfig } = await supabase
          .from('ai_service_configs')
          .select('service_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        // Use OpenAI-specific handler for OpenAI, fall back to universal handler for others
        if (activeConfig?.service_name === 'openai') {
          handlerEndpoint = 'openai-enhanced-concept-learner';
          isOpenAI = true;
        }
      } catch (error) {
        console.warn('Failed to detect AI service, using universal handler:', error);
      }

      let requestBody: any;
      
      if (isOpenAI) {
        // OpenAI-specific request format
        requestBody = {
          topic: concept,
          difficulty: 'intermediate',
          type: 'explanation',
          mode: useAdvancedMode ? 'advanced' : 'basic',
          fileContent: null
        };
      } else {
        // Universal handler format (for Gemini and others)
        requestBody = {
          prompt: concept,
          mode: useAdvancedMode ? 'advanced-concept-learning' : 'basic-concept',
          options: {
            response_format: 'json'
          }
        };
      }

      const { data, error } = await supabase.functions.invoke(handlerEndpoint, {
        body: requestBody
      });

      if (error) {
        throw new Error(error.message);
      }

      if (isOpenAI) {
        // Handle OpenAI enhanced response format
        if (data?.success && data?.result) {
          setExplanation(data.result);
          toast.success('Concept explanation generated!');
        } else {
          throw new Error('Failed to get concept explanation');
        }
      } else {
        // Handle universal handler response format
        if (data?.success && data?.result) {
          setExplanation(data.result);
          toast.success('Concept explanation generated!');
        } else {
          throw new Error('Failed to get concept explanation');
        }
      }
    } catch (err: any) {
      console.error('Concept learning error:', err);
      toast.error('Concept learning failed', {
        description: err.message || 'Please try again'
      });
    } finally {
      setIsLearning(false);
    }
  };

  const exploreRelatedConcept = (relatedConcept: string) => {
    setConcept(relatedConcept);
    setExplanation(null);
  };

  const renderMindMap = () => {
    if (!explanation?.mindMap) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-indigo-500" />
            Mind Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            {/* Center concept */}
            <div className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-lg">
              {explanation.mindMap.center}
            </div>
            
            {/* Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {explanation.mindMap.branches.map((branch, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold text-center mb-3 text-foreground">
                    {branch.topic}
                  </h4>
                  <div className="space-y-2">
                    {branch.subtopics.map((subtopic, subIndex) => (
                      <div key={subIndex} className="bg-background rounded px-3 py-2 text-sm text-center border">
                        {subtopic}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderKnowledgeGraph = () => {
    if (!explanation?.knowledgeGraph) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-emerald-500" />
            Knowledge Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-80 bg-muted/30 rounded-lg overflow-hidden">
            {/* Simple circular layout */}
            <div className="absolute inset-0 flex items-center justify-center">
              {explanation.knowledgeGraph.nodes.map((node, index) => {
                const isMain = node.type === 'main';
                const angle = isMain ? 0 : (index * 360) / (explanation.knowledgeGraph!.nodes.length - 1);
                const radius = isMain ? 0 : 120;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;

                return (
                  <div
                    key={node.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                      isMain
                        ? 'bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold'
                        : 'bg-secondary text-secondary-foreground px-3 py-1 rounded-lg text-sm'
                    }`}
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                    }}
                  >
                    {node.label}
                  </div>
                );
              })}
            </div>
            
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {explanation.knowledgeGraph.edges.map((edge, index) => {
                const fromNode = explanation.knowledgeGraph!.nodes.find(n => n.id === edge.from);
                const toNode = explanation.knowledgeGraph!.nodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                return (
                  <line
                    key={index}
                    x1="50%"
                    y1="50%"
                    x2="50%"
                    y2="50%"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.6"
                  />
                );
              })}
            </svg>
          </div>
          
          {/* Relationships */}
          <div className="mt-4 space-y-2">
            {explanation.knowledgeGraph.edges.map((edge, index) => {
              const fromNode = explanation.knowledgeGraph!.nodes.find(n => n.id === edge.from);
              const toNode = explanation.knowledgeGraph!.nodes.find(n => n.id === edge.to);
              return (
                <div key={index} className="text-sm text-muted-foreground">
                  <span className="font-medium">{fromNode?.label}</span> {edge.relationship} <span className="font-medium">{toNode?.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderYouTubeVideos = () => {
    if (!explanation?.youtubeVideos || explanation.youtubeVideos.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-red-500" />
            Educational Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {explanation.youtubeVideos.map((video) => (
              <div key={video.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Watch Video
                    </a>
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">{video.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{video.channel}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Concept Learner
          </CardTitle>
          <CardDescription>
            Enter any concept you want to understand and learn about
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a concept to learn (e.g., Machine Learning, Photosynthesis, Democracy)"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && learnConcept()}
              className="flex-1"
            />
            <Button 
              onClick={learnConcept} 
              disabled={!concept.trim() || isLearning}
              className="min-w-[100px]"
            >
              {isLearning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Learn'}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="advanced-mode"
              checked={useAdvancedMode}
              onChange={(e) => setUseAdvancedMode(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="advanced-mode" className="text-sm text-muted-foreground">
              Use Advanced Mode (includes Mind Map, Knowledge Graph, and Videos)
            </label>
          </div>
        </CardContent>
      </Card>

      {explanation && (
        <div className="space-y-6">
          {useAdvancedMode ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="keypoints">Key Points</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
                <TabsTrigger value="tips">Study Tips</TabsTrigger>
                <TabsTrigger value="related">Related</TabsTrigger>
                <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
                <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {explanation.concept || concept}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {explanation.explanation || explanation.definition}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="keypoints">
                {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                        Key Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {explanation.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <span className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="examples">
                {explanation.examples && explanation.examples.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        Examples & Applications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {explanation.examples.map((example, index) => (
                          <div key={index} className="p-4 bg-muted/50 rounded-lg border-l-4 border-blue-500">
                            {example}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="tips">
                {explanation.studyTips && explanation.studyTips.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        Study Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {explanation.studyTips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                            <span className="h-2 w-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="related">
                {explanation.relatedConcepts && explanation.relatedConcepts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Related Concepts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {explanation.relatedConcepts.map((related, index) => (
                          <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{related.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{related.relationship}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exploreRelatedConcept(related.name)}
                              >
                                Explore
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="mindmap">
                {renderMindMap()}
              </TabsContent>

              <TabsContent value="graph">
                {renderKnowledgeGraph()}
              </TabsContent>

              <TabsContent value="videos">
                {renderYouTubeVideos()}
              </TabsContent>
            </Tabs>
          ) : (
            /* Original simple layout */
            <div className="space-y-6">
              {/* Concept Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {explanation.concept || concept}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {explanation.explanation || explanation.definition}
                  </p>
                </CardContent>
              </Card>

              {/* Key Points */}
              {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Key Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {explanation.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Examples */}
              {explanation.examples && explanation.examples.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      Examples & Applications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {explanation.examples.map((example, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                          {example}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Practical Applications */}
              {explanation.practicalApplications && explanation.practicalApplications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Practical Applications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {explanation.practicalApplications.map((application, index) => (
                        <Badge key={index} variant="secondary" className="justify-start p-2 h-auto">
                          {application}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Study Tips */}
              {explanation.studyTips && explanation.studyTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      Study Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {explanation.studyTips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="h-2 w-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Related Concepts */}
              {explanation.relatedConcepts && explanation.relatedConcepts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Related Concepts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {explanation.relatedConcepts.map((related, index) => {
                        // Handle both string and object formats for backward compatibility
                        const relatedName = typeof related === 'string' ? related : related.name;
                        const relationship = typeof related === 'object' ? related.relationship : '';
                        
                        return (
                          <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{relatedName}</h4>
                                {relationship && (
                                  <p className="text-sm text-muted-foreground mt-1">{relationship}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exploreRelatedConcept(relatedName)}
                              >
                                Explore
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}