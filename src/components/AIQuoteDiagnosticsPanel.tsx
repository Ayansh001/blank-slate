import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAIQuoteDiagnostics } from "@/hooks/useAIQuoteDiagnostics";
import { useSimpleAIQuotes } from "@/hooks/useSimpleAIQuotes";
import { AlertCircle, CheckCircle, Settings, Zap, RefreshCw } from "lucide-react";

export function AIQuoteDiagnosticsPanel() {
  const { diagnostics, isRunning, runDiagnostics } = useAIQuoteDiagnostics();
  const { showNextQuote, isLoading: isGenerating } = useSimpleAIQuotes();

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusColor = (condition: boolean) => {
    return condition ? "default" : "destructive";
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Quote System Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Status */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">System Status</h3>
          
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.hasActiveAIService)}
              <span>AI Service Configuration</span>
            </div>
            <Badge variant={getStatusColor(diagnostics.hasActiveAIService)}>
              {diagnostics.hasActiveAIService ? 'Active' : 'Missing'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.hasQuotesToday)}
              <span>Today's Quotes Generated</span>
            </div>
            <Badge variant={getStatusColor(diagnostics.hasQuotesToday)}>
              {diagnostics.quotesGenerated} quotes
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              {getStatusIcon(diagnostics.unreadQuotes > 0)}
              <span>Unread Quotes Available</span>
            </div>
            <Badge variant={getStatusColor(diagnostics.unreadQuotes > 0)}>
              {diagnostics.unreadQuotes} unread
            </Badge>
          </div>
        </div>

        {/* AI Service Details */}
        {diagnostics.aiServiceConfig && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">AI Service Details</h3>
            <div className="p-3 rounded-lg border bg-muted/50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Service: <span className="font-mono">{diagnostics.aiServiceConfig.service_name}</span></div>
                <div>Model: <span className="font-mono">{diagnostics.aiServiceConfig.model_name}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Error Information */}
        {diagnostics.lastError && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-red-600">Last Error</h3>
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800">
              <code className="text-sm">{diagnostics.lastError}</code>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Recommendations</h3>
          <div className="space-y-2 text-sm">
            {!diagnostics.hasActiveAIService && (
              <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800">
                • Configure an AI service (OpenAI, Gemini, or Anthropic) in Settings
              </div>
            )}
            {!diagnostics.hasQuotesToday && diagnostics.hasActiveAIService && (
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800">
                • Try generating quotes manually using the button below
              </div>
            )}
            {diagnostics.unreadQuotes === 0 && diagnostics.hasQuotesToday && (
              <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-green-800">
                • All quotes have been read. New quotes will generate tomorrow
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Diagnostics
          </Button>
          
          <Button 
            onClick={showNextQuote}
            disabled={isGenerating}
            size="sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Show Quote
          </Button>
        </div>

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold">Debug Information</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify({ diagnostics }, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}