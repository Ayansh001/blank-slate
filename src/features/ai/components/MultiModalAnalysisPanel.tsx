import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Image, 
  BarChart3, 
  Brain, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FileData } from '@/hooks/useFiles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MultiModalAnalysisProps {
  files: FileData[];
  onAnalysisComplete?: (results: any[]) => void;
}

interface AnalysisJob {
  fileId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

export function MultiModalAnalysisPanel({ files, onAnalysisComplete }: MultiModalAnalysisProps) {
  const { user } = useAuth();
  const [analysisJobs, setAnalysisJobs] = useState<AnalysisJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const startAnalysis = async () => {
    if (!user || files.length === 0) return;

    setIsRunning(true);
    const jobs: AnalysisJob[] = files.map(file => ({
      fileId: file.id,
      fileName: file.name,
      status: 'pending',
      progress: 0
    }));
    
    setAnalysisJobs(jobs);

    try {
      // Process files in batches of 3 to avoid overwhelming the API
      const batchSize = 3;
      const results = [];

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file, batchIndex) => {
          const jobIndex = i + batchIndex;
          
          // Update job status to processing
          setAnalysisJobs(prev => prev.map((job, idx) => 
            idx === jobIndex ? { ...job, status: 'processing', progress: 10 } : job
          ));

          try {
            // Call enhanced document analysis edge function
            const { data, error } = await supabase.functions.invoke('ai-multimodal-analysis', {
              body: {
                fileId: file.id,
                fileName: file.name,
                fileType: file.file_type,
                analysisTypes: ['content_summary', 'visual_analysis', 'key_insights', 'structure_analysis'],
                includeOCR: !!file.ocr_text
              }
            });

            if (error) throw error;

            // Update progress
            setAnalysisJobs(prev => prev.map((job, idx) => 
              idx === jobIndex ? { ...job, progress: 80 } : job
            ));

            // Save analysis to database
            const { error: saveError } = await supabase
              .from('document_analyses')
              .insert({
                file_id: file.id,
                user_id: user.id,
                analysis_type: 'multimodal_analysis',
                ai_service: 'openai',
                model_used: 'gpt-4o',
                analysis_result: data.analysis,
                confidence_score: data.confidence || 0.8,
                processing_time_ms: data.processingTime || 0,
                prompt_used: data.promptUsed
              });

            if (saveError) throw saveError;

            // Mark as completed
            setAnalysisJobs(prev => prev.map((job, idx) => 
              idx === jobIndex ? { 
                ...job, 
                status: 'completed', 
                progress: 100, 
                result: data.analysis 
              } : job
            ));

            return { fileId: file.id, result: data.analysis };

          } catch (error) {
            console.error(`Analysis failed for ${file.name}:`, error);
            
            setAnalysisJobs(prev => prev.map((job, idx) => 
              idx === jobIndex ? { 
                ...job, 
                status: 'error', 
                progress: 0,
                error: error.message 
              } : job
            ));

            return { fileId: file.id, error: error.message };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successfulResults = results.filter(r => r.result);
      if (successfulResults.length > 0) {
        toast.success(`Successfully analyzed ${successfulResults.length} files`);
        onAnalysisComplete?.(successfulResults);
      }

      if (results.some(r => r.error)) {
        toast.error(`${results.filter(r => r.error).length} files failed to analyze`);
      }

    } catch (error) {
      console.error('Batch analysis failed:', error);
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'content_summary': return <FileText className="h-4 w-4" />;
      case 'visual_analysis': return <Eye className="h-4 w-4" />;
      case 'key_insights': return <Brain className="h-4 w-4" />;
      case 'structure_analysis': return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const overallProgress = analysisJobs.length > 0 
    ? Math.round(analysisJobs.reduce((sum, job) => sum + job.progress, 0) / analysisJobs.length)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Multi-Modal AI Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive AI analysis including content, visuals, and structure insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{files.length} files selected</Badge>
              {analysisJobs.length > 0 && (
                <Badge variant={isRunning ? "default" : "secondary"}>
                  {isRunning ? "Running" : "Completed"}
                </Badge>
              )}
            </div>
            <Button 
              onClick={startAnalysis}
              disabled={isRunning || files.length === 0}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Start Analysis
                </>
              )}
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} />
            </div>
          )}

          {analysisJobs.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Analysis Progress</h4>
              <div className="space-y-2">
                {analysisJobs.map((job, index) => (
                  <div key={job.fileId} className="flex items-center gap-3 p-3 rounded-lg border">
                    {getStatusIcon(job.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.fileName}</p>
                      {job.status === 'processing' && (
                        <Progress value={job.progress} className="mt-1 h-1" />
                      )}
                      {job.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {job.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Analysis Types</h5>
              <div className="flex flex-wrap gap-2">
                {['content_summary', 'visual_analysis', 'key_insights', 'structure_analysis'].map(type => (
                  <Badge key={type} variant="outline" className="gap-1">
                    {getAnalysisTypeIcon(type)}
                    {type.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium text-sm">AI Model</h5>
              <Badge>GPT-4o (Vision)</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}