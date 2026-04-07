import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAIConfig } from '../hooks/useAIConfig';
import { AIServiceProvider } from '../types';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { toast } from 'sonner';

export function UnifiedAIServiceSelector() {
  const { configs, activeConfig, setActiveService, validateAPIKey, isSaving } = useAIConfig();
  const [showConfig, setShowConfig] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIServiceProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setShowConfig(!activeConfig);
  }, [activeConfig]);

  const handleProviderSwitch = (provider: AIServiceProvider) => {
    setSelectedProvider(provider);
    const hasConfig = configs.some(c => c.service_name === provider && c.api_key);
    if (!hasConfig) {
      setShowConfig(true);
    }
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      setValidationError('Please enter your API key');
      return;
    }

    if (!validateAPIKey(selectedProvider, apiKey.trim())) {
      setValidationError(
        selectedProvider === 'openai' ? 'OpenAI keys start with sk-...' :
        selectedProvider === 'gemini' ? 'Google API keys start with AIza...' :
        'Invalid API key format'
      );
      return;
    }

    setValidationError('');
    
    try {
      const defaultModels: Record<AIServiceProvider, string> = {
        openai: 'gpt-4o-mini',
        gemini: 'gemini-2.0-flash',
        anthropic: 'claude-3-haiku-20240307'
      };
      
      await setActiveService({
        service_name: selectedProvider,
        api_key: apiKey.trim(),
        model_name: defaultModels[selectedProvider],
        is_active: true
      });

      setApiKey('');
      setShowConfig(false);
      toast.success('AI service configured successfully!');
    } catch (error) {
      console.error('Config save error:', error);
      setValidationError('Failed to save configuration. Please try again.');
      toast.error('Failed to configure AI service');
    }
  };

  if (activeConfig && !showConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Connected to {activeConfig.service_name === 'openai' ? 'OpenAI' : activeConfig.service_name === 'gemini' ? 'Gemini' : 'Anthropic'}
          </CardTitle>
          <CardDescription>
            Using {activeConfig.model_name} • Ready to use AI features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={activeConfig.service_name} onValueChange={(v) => handleProviderSwitch(v as AIServiceProvider)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Switch provider" />
              </SelectTrigger>
              <SelectContent>
                {(['openai', 'gemini', 'anthropic'] as AIServiceProvider[]).map(provider => (
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
              Update Key
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Service Setup
        </CardTitle>
        <CardDescription>
          Choose your AI provider and enter your API key to enable all AI features
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
          <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as AIServiceProvider)}>
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
              'AIza...'
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {selectedProvider === 'openai' && 'Get your key from platform.openai.com'}
            {selectedProvider === 'gemini' && 'Get your key from Google AI Studio (aistudio.google.com)'}
            {selectedProvider === 'anthropic' && 'Get your key from console.anthropic.com'}
          </p>
        </div>

        <Button 
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Connect & Enable AI Features'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
