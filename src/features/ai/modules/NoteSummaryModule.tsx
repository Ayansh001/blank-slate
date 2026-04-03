import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { useAIProvider } from '../hooks/useAIProvider';
import { AIProviderFactory } from '../providers/AIProviderFactory';
import { EnhancementResult } from '../types/providers';
import { logger } from '../utils/DebugLogger';
import { toast } from '@/hooks/use-toast';

interface NoteSummaryModuleProps {
  content: string;
  onSummaryGenerated?: (summary: string) => void;
  className?: string;
}

export const NoteSummaryModule: React.FC<NoteSummaryModuleProps> = ({
  content,
  onSummaryGenerated,
  className,
}) => {
  const { selectedProvider, getProviderConfig } = useAIProvider();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<EnhancementResult<string> | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const generateSummary = async () => {
    if (!content.trim()) {
      toast({
        title: "No content",
        description: "Please provide content to summarize.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      setResult(null);
      const startTime = Date.now();

      logger.info('NoteSummaryModule', 'Starting summary generation', {
        provider: selectedProvider,
        contentLength: content.length,
      });

      const config = await getProviderConfig();
      if (!config) {
        throw new Error(`No configuration found for ${selectedProvider} provider`);
      }

      const provider = AIProviderFactory.createProvider(config);
      const summary = await provider.generateSummary(content); // Now returns string directly

      const endTime = Date.now();
      const duration = endTime - startTime;
      setProcessingTime(duration);

      const enhancementResult: EnhancementResult<string> = {
        success: true,
        data: summary,
        provider: selectedProvider || 'openai',
        model: config.model,
        processingTime: duration,
      };

      setResult(enhancementResult);
      onSummaryGenerated?.(summary);

      logger.info('NoteSummaryModule', 'Summary generated successfully', {
        provider: selectedProvider,
        processingTime: duration,
        summaryLength: summary.length,
      });

      toast({
        title: "Summary generated",
        description: `Generated in ${(duration / 1000).toFixed(1)}s using ${selectedProvider}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error('NoteSummaryModule', 'Failed to generate summary', {
        error: errorMessage,
        provider: selectedProvider,
      });

      setResult({
        success: false,
        error: errorMessage,
        provider: selectedProvider || 'openai',
      });

      toast({
        title: "Summary generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const retry = () => {
    generateSummary();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4" />
          AI Summary Generator
          {selectedProvider && (
            <Badge variant="secondary" className="text-xs">
              {selectedProvider}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={generateSummary}
            disabled={isGenerating || !selectedProvider}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
          
          {result && !result.success && (
            <Button
              onClick={retry}
              variant="outline"
              size="icon"
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {result && (
          <div className="space-y-3">
            {result.success && result.data ? (
              <div className="space-y-2">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {result.data}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {processingTime && (
                    <span>Generated in {(processingTime / 1000).toFixed(1)}s</span>
                  )}
                  {result.provider && (
                    <span>Using {result.provider}</span>
                  )}
                  {result.model && (
                    <span>Model: {result.model}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">
                    Summary generation failed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {result.error}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedProvider && (
          <div className="p-3 bg-warning/10 rounded-lg">
            <p className="text-sm text-warning-foreground">
              No AI provider selected. Please configure an AI service first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
