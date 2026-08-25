// Document Analysis Panel - UI for analyzing documents with AI
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  FileText, 
  List, 
  HelpCircle, 
  BookOpen, 
  Tags,
  Loader2,
  Clock,
  Zap
} from 'lucide-react';
import { useDocumentAnalysis } from '../hooks/useDocumentAnalysis';
import { useAIConfig } from '../hooks/useAIConfig';
import { DocumentAnalysis } from '../types';

interface DocumentAnalysisPanelProps {
  fileId: string;
  fileName: string;
}

export function DocumentAnalysisPanel({ fileId, fileName }: DocumentAnalysisPanelProps) {
  const { fileAnalyses, analyzeDocument, isAnalyzing, hasAnalysis } = useDocumentAnalysis(fileId);
  const { activeConfig } = useAIConfig();
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('summary');

  const analysisTypes = [
    { id: 'summary', label: 'Summary', icon: FileText, description: 'Get a comprehensive summary' },
    { id: 'key_points', label: 'Key Points', icon: List, description: 'Extract main points and arguments' },
    { id: 'questions', label: 'Questions', icon: HelpCircle, description: 'Generate study questions' },
    { id: 'concepts', label: 'Concepts', icon: BookOpen, description: 'Identify key concepts and terms' },
    { id: 'topics', label: 'Topics', icon: Tags, description: 'Categorize main topics and themes' }
  ];

  const handleAnalyze = (analysisType: string) => {
    analyzeDocument({
      fileId,
      analysisType: analysisType as any,
      customPrompt: customPrompt || undefined
    });
  };

  const renderAnalysisResult = (analysis: DocumentAnalysis) => {
    const result = analysis.analysis_result;
    
    switch (analysis.analysis_type) {
      case 'key_points':
        return (
          <div className="space-y-2">
            {result.points?.map((point: string, index: number) => (
              <div key={index} className="flex gap-2">
                <span className="text-primary font-medium">{index + 1}.</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        );
      
      case 'questions':
        return (
          <div className="space-y-3">
            {result.questions?.map((question: string, index: number) => (
              <div key={index} className="p-3 bg-muted rounded-lg">
                <div className="flex gap-2">
                  <HelpCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{question}</span>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'concepts':
        return (
          <div className="space-y-3">
            {result.concepts?.map((concept: any, index: number) => (
              <div key={index} className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold text-primary">{concept.term}</h4>
                <p className="text-sm text-muted-foreground">{concept.definition}</p>
              </div>
            ))}
          </div>
        );
      
      case 'topics':
        return (
          <div className="space-y-4">
            {result.topics?.map((topic: any, index: number) => (
              <div key={index} className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Tags className="h-4 w-4 text-primary" />
                  {topic.topic}
                </h4>
                {topic.subtopics && (
                  <ul className="ml-6 space-y-1">
                    {topic.subtopics.map((subtopic: string, subIndex: number) => (
                      <li key={subIndex} className="text-sm text-muted-foreground">
                        • {subtopic}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        );
      
      default:
        return (
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{result.summary || result.raw_content}</p>
          </div>
        );
    }
  };

  if (!activeConfig) {
    return (
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          Please configure an AI service first to use document analysis features.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-xl font-semibold">AI Document Analysis</h3>
          <p className="text-sm text-muted-foreground">Analyze: {fileName}</p>
        </div>
      </div>

      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Types</CardTitle>
          <CardDescription>
            Choose the type of analysis you want to perform on this document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {analysisTypes.map((type) => {
              const Icon = type.icon;
              const hasThisAnalysis = hasAnalysis(type.id as any);
              
              return (
                <Card 
                  key={type.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedAnalysisType === type.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedAnalysisType(type.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{type.label}</span>
                      {hasThisAnalysis && (
                        <Badge variant="secondary" className="text-xs">
                          Done
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Custom Prompt (Optional)
              </label>
              <Textarea
                placeholder="Enter a custom prompt to guide the analysis..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Button 
              onClick={() => handleAnalyze(selectedAnalysisType)}
              disabled={isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Analyze Document
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {fileAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              AI-generated insights from your document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={fileAnalyses[0]?.analysis_type}>
              <TabsList className="grid w-full grid-cols-5">
                {fileAnalyses.map((analysis) => (
                  <TabsTrigger 
                    key={analysis.id} 
                    value={analysis.analysis_type}
                    className="text-xs"
                  >
                    {analysisTypes.find(t => t.id === analysis.analysis_type)?.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {fileAnalyses.map((analysis) => (
                <TabsContent key={analysis.id} value={analysis.analysis_type} className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{analysis.ai_service}</Badge>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {analysis.processing_time_ms}ms
                        </span>
                        {analysis.confidence_score && (
                          <span>Confidence: {(analysis.confidence_score * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      {renderAnalysisResult(analysis)}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}