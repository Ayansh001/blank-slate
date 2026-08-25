
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlaskConical, Download, Trash2 } from 'lucide-react';
import { NoteSummaryModule } from '@/features/ai/modules/NoteSummaryModule';
import { NoteKeyPointsModule } from '@/features/ai/modules/NoteKeyPointsModule';
import { NoteQuestionsModule } from '@/features/ai/modules/NoteQuestionsModule';
import { MultipleChoiceQuizModule } from '@/features/ai/modules/MultipleChoiceQuizModule';
import { ProviderSwitcher } from '@/features/ai/components/ProviderSwitcher';
import { AIErrorBoundary } from '@/features/ai/components/AIErrorBoundary';
import { logger, DebugLogger } from '@/features/ai/utils/DebugLogger';
import { toast } from '@/hooks/use-toast';

const sampleContent = `Machine Learning and Artificial Intelligence

Machine Learning (ML) is a subset of artificial intelligence (AI) that focuses on the development of algorithms and statistical models that enable computers to perform tasks without explicit programming instructions.

Key Concepts:
- Supervised Learning: Training algorithms on labeled data to make predictions
- Unsupervised Learning: Finding patterns in data without labeled examples
- Deep Learning: Using neural networks with multiple layers to model complex patterns
- Natural Language Processing: Enabling computers to understand and generate human language

Applications:
Machine learning has revolutionized many industries including healthcare (medical diagnosis), finance (fraud detection), transportation (autonomous vehicles), and technology (recommendation systems).

The field continues to evolve rapidly with new techniques and applications emerging regularly. Understanding these fundamentals is crucial for anyone working with modern AI systems.`;

export default function AITestground() {
  const [testContent, setTestContent] = useState(sampleContent);
  const [logs, setLogs] = useState<any[]>([]);

  const refreshLogs = () => {
    const debugLogger = DebugLogger.getInstance();
    setLogs(debugLogger.getLogs());
  };

  const clearLogs = () => {
    const debugLogger = DebugLogger.getInstance();
    debugLogger.clearLogs();
    setLogs([]);
    toast({
      title: "Logs cleared",
      description: "All debug logs have been cleared.",
    });
  };

  const exportLogs = () => {
    const debugLogger = DebugLogger.getInstance();
    const logsData = debugLogger.exportLogs();
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-debug-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    refreshLogs();
    const interval = setInterval(refreshLogs, 2000); // Refresh logs every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-6 h-6" />
          <h1 className="text-2xl font-bold">AI Testing Playground</h1>
          <Badge variant="secondary">Development Mode</Badge>
        </div>
        <ProviderSwitcher />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Input */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Test Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="Enter content to test AI enhancements..."
              className="min-h-[300px] resize-none"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              {testContent.length} characters
            </div>
          </CardContent>
        </Card>

        {/* AI Modules */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="keypoints">Key Points</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <AIErrorBoundary>
                <NoteSummaryModule 
                  content={testContent}
                  onSummaryGenerated={(summary) => {
                    logger.info('AITestground', 'Summary generated', { length: summary.length });
                  }}
                />
              </AIErrorBoundary>
            </TabsContent>
            
            <TabsContent value="keypoints" className="space-y-4">
              <AIErrorBoundary>
                <NoteKeyPointsModule 
                  content={testContent}
                  onKeyPointsGenerated={(keyPoints) => {
                    logger.info('AITestground', 'Key points generated', { count: keyPoints.length });
                  }}
                />
              </AIErrorBoundary>
            </TabsContent>
            
            <TabsContent value="questions" className="space-y-4">
              <AIErrorBoundary>
                <NoteQuestionsModule 
                  content={testContent}
                  onQuestionsGenerated={(questions) => {
                    logger.info('AITestground', 'Questions generated', { count: questions.length });
                  }}
                />
              </AIErrorBoundary>
            </TabsContent>
            
            <TabsContent value="quiz" className="space-y-4">
              <AIErrorBoundary>
                <MultipleChoiceQuizModule 
                  content={testContent}
                />
              </AIErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Debug Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Debug Logs</CardTitle>
            <div className="flex gap-2">
              <Button onClick={refreshLogs} variant="outline" size="sm">
                Refresh
              </Button>
              <Button onClick={exportLogs} variant="outline" size="sm">
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
              <Button onClick={clearLogs} variant="outline" size="sm">
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No logs available</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={
                          log.level === 'error' ? 'destructive' :
                          log.level === 'warn' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {log.level}
                      </Badge>
                      <span className="text-muted-foreground">{log.timestamp}</span>
                      <span className="font-medium">[{log.module}]</span>
                    </div>
                    <p>{log.message}</p>
                    {log.data && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-muted-foreground">
                          Data
                        </summary>
                        <pre className="mt-1 text-xs bg-background p-1 rounded overflow-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
