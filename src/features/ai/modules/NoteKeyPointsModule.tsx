import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, List, AlertCircle, RefreshCw, Copy, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAIProvider } from '../hooks/useAIProvider';
import { AIProviderFactory } from '../providers/AIProviderFactory';
import { EnhancementResult } from '../types/providers';
import { logger } from '../utils/DebugLogger';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';

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
  } else {
    toast.error(fallbackTitle, { description: msg });
  }
}

interface NoteKeyPointsModuleProps {
  content: string;
  onKeyPointsGenerated?: (keyPoints: string[]) => void;
  className?: string;
}

export const NoteKeyPointsModule: React.FC<NoteKeyPointsModuleProps> = ({
  content,
  onKeyPointsGenerated,
  className,
}) => {
  const { selectedProvider, getProviderConfig } = useAIProvider();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<EnhancementResult<string[]> | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const copyKeyPoint = (keyPoint: string) => {
    navigator.clipboard.writeText(keyPoint).then(() => {
      toast.success('Key point copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy key point');
    });
  };

  const saveKeyPointAsNote = async (keyPoint: string, index: number) => {
    if (!user) {
      toast.error('Please log in to save notes');
      return;
    }

    try {
      const { error } = await supabase.from('notes').insert({
        user_id: user.id,
        title: `Key Point #${index + 1}`,
        content: `<p>${keyPoint}</p>`,
        plain_text: keyPoint,
        tags: ['key-point', 'ai-generated'],
        category: 'AI Generated'
      });

      if (error) throw error;
      toast.success('Key point saved as new note!');
    } catch (error) {
      console.error('Failed to save key point as note:', error);
      toast.error('Failed to save as note');
    }
  };

  const generateKeyPoints = async () => {
    if (!content.trim()) {
      toast.error('No content', { description: 'Please provide content to extract key points from.' });
      return;
    }

    try {
      setIsGenerating(true);
      setResult(null);
      const startTime = Date.now();

      logger.info('NoteKeyPointsModule', 'Starting key points extraction', {
        provider: selectedProvider,
        contentLength: content.length,
      });

      const config = await getProviderConfig();
      if (!config) {
        toast.error('No API key configured', { description: 'Go to Settings → AI Configuration to add your key.' });
        return;
      }

      const provider = AIProviderFactory.createProvider(config);
      const keyPoints = await provider.generateKeyPoints(content);

      const duration = Date.now() - startTime;
      setProcessingTime(duration);

      const enhancementResult: EnhancementResult<string[]> = {
        success: true,
        data: keyPoints,
        provider: selectedProvider || 'openai',
        model: config.model,
        processingTime: duration,
      };

      setResult(enhancementResult);
      onKeyPointsGenerated?.(keyPoints);

      toast.success('Key points extracted', {
        description: `Found ${keyPoints.length} key points in ${(duration / 1000).toFixed(1)}s`,
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      logger.error('NoteKeyPointsModule', 'Failed to extract key points', {
        error: errorMessage,
        code: error?.code,
        provider: selectedProvider,
      });

      setResult({
        success: false,
        error: errorMessage,
        provider: selectedProvider || 'openai',
      });

      showClassifiedError(error, 'Key points extraction failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const retry = () => {
    generateKeyPoints();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <List className="w-4 h-4" />
          Key Points Extractor
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
            onClick={generateKeyPoints}
            disabled={isGenerating || !selectedProvider}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <List className="w-4 h-4 mr-2" />
                Extract Key Points
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
                <div className="space-y-3">
                  {result.data.map((point, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-2 text-sm mb-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="flex-1">{point}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyKeyPoint(point)}
                          className="text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => saveKeyPointAsNote(point, index)}
                          className="text-xs"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save as Note
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{result.data.length} key points found</span>
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
                    Key points extraction failed
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
