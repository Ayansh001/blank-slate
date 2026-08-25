
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Settings, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { useNavigate } from 'react-router-dom';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { AIServiceProvider } from '@/features/ai/types';

export function AIServiceStatus() {
  const { activeConfig, configs, isLoading } = useAIConfig();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <span className="text-sm text-muted-foreground">Checking AI service status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeConfig) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>No AI service configured. Please set up an AI service to use enhanced features.</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/settings')}
            className="ml-2"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-green-200 dark:border-green-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AIProviderLogo provider={activeConfig.service_name as AIServiceProvider} size="sm" />
            <CheckCircle className="h-4 w-4 text-green-600" />
            AI Service Active
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Wifi className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{activeConfig.service_name}</span>
            <span className="mx-1">•</span>
            <span>{activeConfig.model_name}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/settings')}
            className="h-6 px-2 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
