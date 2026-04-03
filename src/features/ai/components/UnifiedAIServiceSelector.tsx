
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAIProvider } from '../hooks/useAIProvider';
import { useAIConfig } from '../hooks/useAIConfig';
import { AIServiceProvider } from '../types';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { toast } from 'sonner';

export function UnifiedAIServiceSelector() {
  const { selectedProvider, availableProviders, switchProvider, isLoading } = useAIProvider();
  const { configs, activeConfig, saveConfig, testAPIKey, validateAPIKey, isSaving } = useAIConfig();
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  console.log('UnifiedAIServiceSelector rendering:', { 
    selectedProvider, 
    availableProviders, 
    activeConfig,
    isLoading,
    showConfig 
  });

  useEffect(() => {
    // Show config form if no active config exists
    setShowConfig(!activeConfig);
  }, [activeConfig]);

  const handleProviderSwitch = async (provider: AIServiceProvider) => {
    try {
      console.log('Switching provider to:', provider);
      await switchProvider(provider);
      const hasConfig = configs.some(c => c.service_name === provider && c.api_key);
      setShowConfig(!hasConfig);
    } catch (error) {
      console.error('Provider switch error:', error);
      toast.error('Failed to switch provider');
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedProvider) {
      setValidationError('Please select a provider first');
      return;
    }

    if (!apiKey.trim()) {
      setValidationError('Please enter your API key');
      return;
    }

    if (!validateAPIKey(selectedProvider, apiKey)) {
      setValidationError('Invalid API key format');
      return;
    }

    setIsValidating(true);
    setValidationError('');
    
    try {
      const isValid = await testAPIKey(selectedProvider, apiKey);
      if (!isValid) {
        setValidationError('API key validation failed. Please check your key and try again.');
        return;
      }

      const defaultModels = {
        openai: 'gpt-4o-mini',
        gemini: 'gemini-2.0-flash',
        anthropic: 'claude-3-haiku-20240307'
      };
      
      await saveConfig({
        service_name: selectedProvider,
        api_key: apiKey,
        model_name: defaultModels[selectedProvider],
        is_active: true
      });

      setApiKey('');
      setShowConfig(false);
      toast.success('AI service configured successfully!');
    } catch (error) {
      console.error('Config save error:', error);
      setValidationError('Failed to configure AI service. Please try again.');
      toast.error('Failed to configure AI service');
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    console.log('Showing loading state');
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (activeConfig && !showConfig) {
    console.log('Showing connected state for:', activeConfig.service_name);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Connected to {activeConfig.service_name}
          </CardTitle>
          <CardDescription>
            Using {activeConfig.model_name} • Ready to use AI features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={selectedProvider || ''} onValueChange={handleProviderSwitch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Switch provider" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    <div className="flex items-center gap-2">
                      <AIProviderLogo provider={provider} size="sm" />
                      <span>{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowConfig(true)}>
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('Showing setup form');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Service Setup
        </CardTitle>
        <CardDescription>
          Choose and configure your AI provider to enable AI features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>AI Provider</Label>
          <Select value={selectedProvider || ''} onValueChange={handleProviderSwitch}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <AIProviderLogo provider="openai" size="sm" />
                  <span>OpenAI (GPT-4o Mini) - Fast & Reliable</span>
                </div>
              </SelectItem>
              <SelectItem value="gemini">
                <div className="flex items-center gap-2">
                  <AIProviderLogo provider="gemini" size="sm" />
                  <span>Google Gemini (2.0 Flash) - Advanced & Free</span>
                </div>
              </SelectItem>
              <SelectItem value="anthropic">
                <div className="flex items-center gap-2">
                  <AIProviderLogo provider="anthropic" size="sm" />
                  <span>Anthropic (Claude Haiku) - Thoughtful & Precise</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedProvider && (
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={
                selectedProvider === 'openai' ? 'sk-...' : 
                selectedProvider === 'anthropic' ? 'sk-ant-...' : 
                'AIzaSy...'
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {selectedProvider === 'openai' && 'Get your key from platform.openai.com'}
              {selectedProvider === 'gemini' && 'Get your key from Google AI Studio'}
              {selectedProvider === 'anthropic' && 'Get your key from console.anthropic.com'}
            </p>
          </div>
        )}

        <Button 
          onClick={handleSaveConfig}
          disabled={isSaving || isValidating || !selectedProvider}
          className="w-full"
        >
          {isSaving || isValidating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {isValidating ? 'Validating...' : 'Saving...'}
            </>
          ) : (
            'Connect & Enable AI Features'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
