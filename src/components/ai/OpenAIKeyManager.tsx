import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Eye, EyeOff, Key, Loader2, Cloud, HardDrive } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { toast } from 'sonner';

interface OpenAIKeyManagerProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function OpenAIKeyManager({ onConnectionChange }: OpenAIKeyManagerProps) {
  const { user } = useAuth();
  const { configs, activeConfig, testAPIKey, isLoading: isConfigLoading } = useAIConfig();
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [hasTestedConnection, setHasTestedConnection] = useState(false);
  const [hasBackendKey, setHasBackendKey] = useState(false);
  const [useLocalOverride, setUseLocalOverride] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Sync backend key state from useAIConfig
  useEffect(() => {
    if (isConfigLoading) return;

    const openaiConfig = configs.find(config =>
      config.service_name === 'openai' &&
      config.is_active === true &&
      config.api_key
    );

    const hasKey = !!openaiConfig;
    setHasBackendKey(hasKey);

    if (hasKey && !useLocalOverride && !hasTestedConnection) {
      // Backend key exists — test connection through provider pipeline
      testBackendConnection(openaiConfig!.api_key);
    } else if (!hasKey) {
      // No backend key — check localStorage for legacy local key
      const localKey = localStorage.getItem('openai-api-key');
      if (localKey && localKey !== 'server-resolved') {
        setApiKey(localKey);
        setSavedKey(localKey);
      }
    }
  }, [configs, isConfigLoading, user, useLocalOverride]);

  const testBackendConnection = async (backendApiKey: string) => {
    setIsTestingConnection(true);
    setConnectionError(null);
    try {
      const result = await testAPIKey('openai', backendApiKey);
      setIsConnected(result);
      setHasTestedConnection(true);
      onConnectionChange?.(result);
      if (result) {
        toast.success('Backend connection verified');
      } else {
        setConnectionError('Connection test failed. Check your API key in AI service settings.');
      }
    } catch (error: any) {
      setIsConnected(false);
      setHasTestedConnection(true);
      onConnectionChange?.(false);
      setConnectionError(getClassifiedErrorMessage(error));
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getClassifiedErrorMessage = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'invalid_key':
        return 'Invalid API key. Please update your key in AI service settings.';
      case 'quota_exceeded':
        return 'API quota exceeded. Check your billing and usage limits.';
      case 'rate_limited':
        return 'Rate limited. Please wait a moment and try again.';
      case 'network_error':
        return 'Network error. Check your internet connection.';
      case 'config_error':
        return 'Configuration error. Check your organization settings.';
      case 'bad_request':
        return 'Invalid model or request configuration.';
      default:
        return error?.message || 'Connection test failed. Verify your API key and quota.';
    }
  };

  const handleSaveKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      toast.error('Please enter your OpenAI API key');
      return;
    }

    if (!trimmedKey.startsWith('sk-')) {
      toast.error('OpenAI API keys should start with "sk-"');
      return;
    }

    setIsTestingConnection(true);
    setConnectionError(null);
    try {
      const connected = await testAPIKey('openai', trimmedKey);

      if (connected) {
        setSavedKey(trimmedKey);
        localStorage.setItem('openai-api-key', trimmedKey);
        setIsConnected(true);
        setHasTestedConnection(true);
        onConnectionChange?.(true);
        toast.success('OpenAI API key saved and verified!');
      } else {
        setIsConnected(false);
        setHasTestedConnection(true);
        onConnectionChange?.(false);
        toast.error('Connection test failed', {
          description: 'Verify your API key, model selection, and available quota'
        });
      }
    } catch (error: any) {
      setIsConnected(false);
      setHasTestedConnection(true);
      onConnectionChange?.(false);
      const msg = getClassifiedErrorMessage(error);
      setConnectionError(msg);
      toast.error('Connection test failed', {
        description: msg
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('openai-api-key');
    setApiKey('');
    setSavedKey('');
    setIsConnected(false);
    setHasTestedConnection(false);
    setConnectionError(null);
    onConnectionChange?.(false);
    toast.success('API key cleared');
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          OpenAI API Configuration
        </CardTitle>
        <CardDescription>
          {hasBackendKey && !useLocalOverride
            ? 'OpenAI is configured via your backend settings.'
            : 'Enter your OpenAI API key to use the concept learner. Your key is stored locally and never sent to our servers.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Backend Key Status */}
        {hasBackendKey && !useLocalOverride && (
          <Alert>
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                Connected via backend configuration. OpenAI API key is managed in your AI service settings.
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Connection Status */}
        {hasTestedConnection && (useLocalOverride || !hasBackendKey) && (
          <Alert variant={isConnected ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="flex items-center gap-2">
                {isConnected 
                  ? 'Connected to OpenAI successfully' 
                  : connectionError || 'Connection test failed. Verify your API key and quota.'
                }
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Backend connection error */}
        {hasBackendKey && !useLocalOverride && hasTestedConnection && !isConnected && connectionError && (
          <Alert variant="destructive">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>{connectionError}</AlertDescription>
            </div>
          </Alert>
        )}

        {/* Backend Override Toggle */}
        {hasBackendKey && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Use local API key instead</span>
              <p className="text-muted-foreground text-xs mt-1">
                Override backend configuration with a local key
              </p>
            </div>
            <Button 
              variant={useLocalOverride ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                setUseLocalOverride(!useLocalOverride);
                if (!useLocalOverride) {
                  const localKey = localStorage.getItem('openai-api-key');
                  if (localKey && localKey !== 'server-resolved') {
                    setApiKey(localKey);
                    setSavedKey(localKey);
                  }
                }
              }}
            >
              {useLocalOverride ? 'Using Local' : 'Use Local'}
            </Button>
          </div>
        )}

        {/* API Key Input */}
        {(useLocalOverride || !hasBackendKey) && (
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isTestingConnection}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleSaveKey} 
                disabled={isTestingConnection || !apiKey.trim()}
              >
                {isTestingConnection && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {savedKey ? 'Update' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {/* Saved Key Status */}
        {savedKey && (useLocalOverride || !hasBackendKey) && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <div className="text-sm">
                <span className="font-medium">Local Key: </span>
                <code className="text-xs">{maskKey(savedKey)}</code>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearKey}>
              Clear
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground">
          <p>
            Get your OpenAI API key from{' '}
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OpenAI Platform
            </a>
          </p>
          <p className="mt-1">
            Your API key is stored securely in your browser's local storage and used only for direct API calls to OpenAI.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
