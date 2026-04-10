import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { useAIProvider } from '../hooks/useAIProvider';
import { AIProviderFactory } from '../providers/AIProviderFactory';
import { EnhancementResult } from '../types/providers';
import { logger } from '../utils/DebugLogger';
import { toast } from 'sonner';

// Classified error toast helper
function showClassifiedError(error: any, fallbackTitle: string) {
  const code = error?.code || '';
  const msg = error?.message || 'Unknown error';
  if (code === 'invalid_key') {
    toast.error('Invalid API key', { description: 'Check your API key in Settings → AI Configuration' });
  } else if (code === 'quota_exceeded') {
    toast.error('API quota exceeded', { description: 'Check your billing or try again later' });
  } else if (code === 'rate_limited') {
    toast.error('Rate limited', { description: 'Please wait a moment and try again' });
  } else if (code === 'network_error') {
    toast.error('Network error', { description: 'Check your internet connection and try again' });
  } else if (code === 'config_error') {
    toast.error('Configuration error', { description: 'Check your AI provider settings' });
  } else {
    toast.error(fallbackTitle, { description: msg });
  }
}

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
      toast.error('No content', { description: 'Please provide content to summarize.' });
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
        toast.error('No API key configured', { description: 'Go to Settings → AI Configuration to add your key.' });
        return;
      }

      const provider = AIProviderFactory.createProvider(config);
      const summary = await provider.generateSummary(content);

      const duration = Date.now() - startTime;
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

      toast.success('Summary generated', {
        description: `Generated in ${(duration / 1000).toFixed(1)}s using ${selectedProvider}`,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      logger.error('NoteSummaryModule', 'Failed to generate summary', {
        error: errorMessage,
        code: error?.code,
        provider: selectedProvider,
      });

      setResult({
        success: false,
        error: errorMessage,
        provider: selectedProvider || 'openai',
      });

      showClassifiedError(error, 'Summary generation failed');
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
