import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Eye, EyeOff, Key, Loader2, Cloud, HardDrive } from 'lucide-react';
import { openAIConceptLearningService } from '@/services/OpenAIConceptLearningService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AIServiceManager } from '@/features/ai/services/AIServiceManager';
import { toast } from 'sonner';

interface OpenAIKeyManagerProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function OpenAIKeyManager({ onConnectionChange }: OpenAIKeyManagerProps) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [hasTestedConnection, setHasTestedConnection] = useState(false);
  const [keySource, setKeySource] = useState<'backend' | 'local' | 'none'>('none');
  const [hasBackendKey, setHasBackendKey] = useState(false);
  const [useLocalOverride, setUseLocalOverride] = useState(false);

  useEffect(() => {
    // Load existing key on mount
    const initializeKeyState = async () => {
      // Check for backend key first
      if (user) {
        await checkBackendKey();
      }
      
      // Then check local key
      const existingKey = await openAIConceptLearningService.getApiKey(user?.id);
      if (existingKey) {
        setSavedKey(existingKey);
        setApiKey(existingKey);
        setKeySource(openAIConceptLearningService.getKeySource());
        testExistingConnection(existingKey);
      }
    };

    initializeKeyState();
  }, [user]);

  const checkBackendKey = async () => {
    if (!user) return;
    
    try {
      const aiServiceManager = AIServiceManager.getInstance();
      const configs = await aiServiceManager.getUserAIConfigs(user.id);
      const openaiConfig = configs.find(config => 
        config.service_name === 'openai' && 
        config.is_active === true && 
        config.api_key
      );
      
      setHasBackendKey(!!openaiConfig);
    } catch (error) {
      console.warn('Failed to check backend key:', error);
      setHasBackendKey(false);
    }
  };

  const testExistingConnection = async (key: string) => {
    setIsTestingConnection(true);
    try {
      const connected = await openAIConceptLearningService.testConnection();
      setIsConnected(connected);
      setHasTestedConnection(true);
      onConnectionChange?.(connected);
    } catch (error) {
      setIsConnected(false);
      setHasTestedConnection(true);
      onConnectionChange?.(false);
    } finally {
      setIsTestingConnection(false);
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
    try {
      // Test the connection first
      openAIConceptLearningService.setApiKey(trimmedKey);
      const connected = await openAIConceptLearningService.testConnection();
      
      if (connected) {
        setSavedKey(trimmedKey);
        setIsConnected(true);
        setHasTestedConnection(true);
        onConnectionChange?.(true);
        toast.success('OpenAI API key saved and verified!');
      } else {
        openAIConceptLearningService.clearApiKey();
        setIsConnected(false);
        setHasTestedConnection(true);
        onConnectionChange?.(false);
        toast.error('Invalid API key or connection failed');
      }
    } catch (error) {
      openAIConceptLearningService.clearApiKey();
      setIsConnected(false);
      setHasTestedConnection(true);
      onConnectionChange?.(false);
      toast.error('Failed to verify API key');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleClearKey = () => {
    openAIConceptLearningService.clearApiKey();
    setApiKey('');
    setSavedKey('');
    setIsConnected(false);
    setHasTestedConnection(false);
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
                {keySource === 'local' && <HardDrive className="h-4 w-4" />}
                {isConnected 
                  ? `Connected to OpenAI successfully${keySource === 'local' ? ' (local key)' : ''}` 
                  : 'Not connected to OpenAI. Please check your API key.'
                }
              </AlertDescription>
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
                  // Switching to local override
                  const localKey = localStorage.getItem('openai-api-key');
                  if (localKey) {
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