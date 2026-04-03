import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Key } from 'lucide-react';
import { useAIConfig } from '../hooks/useAIConfig';
import { AIServiceProvider } from '../types';
import { toast } from 'sonner';

interface AIConfigValidatorProps {
  provider: AIServiceProvider;
  onValidationComplete?: (isValid: boolean) => void;
}

export function AIConfigValidator({ provider, onValidationComplete }: AIConfigValidatorProps) {
  const { testAPIKey, validateAPIKey, saveConfig, isSaving } = useAIConfig();
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [modelName, setModelName] = useState('');

  const getDefaultModel = (provider: AIServiceProvider) => {
    switch (provider) {
      case 'openai':
        return 'gpt-4o-mini';
      case 'gemini':
        return 'gemini-2.0-flash';
      case 'anthropic':
        return 'claude-3-haiku-20240307';
      default:
        return '';
    }
  };

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    if (!validateAPIKey(provider, apiKey)) {
      setValidationResult(false);
      toast.error('Invalid API key format');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const isValid = await testAPIKey(provider, apiKey);
      setValidationResult(isValid);
      
      if (isValid) {
        toast.success('API key validated successfully!');
        onValidationComplete?.(true);
      } else {
        toast.error('API key validation failed');
        onValidationComplete?.(false);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult(false);
      toast.error('Failed to validate API key');
      onValidationComplete?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!validationResult) {
      toast.error('Please validate your API key first');
      return;
    }

    const model = modelName || getDefaultModel(provider);
    
    try {
      await saveConfig({
        service_name: provider,
        api_key: apiKey,
        model_name: model,
        is_active: true
      });
      
      toast.success(`${provider.toUpperCase()} configuration saved!`);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save configuration');
    }
  };

  const getProviderInfo = (provider: AIServiceProvider) => {
    switch (provider) {
      case 'openai':
        return {
          name: 'OpenAI',
          description: 'GPT models for chat and completion',
          keyFormat: 'sk-...',
          models: ['gpt-4o', 'gpt-4o-mini']
        };
      case 'gemini':
        return {
          name: 'Google Gemini',
          description: 'Google\'s multimodal AI models',
          keyFormat: 'AIzaSy...',
          models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
        };
      case 'anthropic':
        return {
          name: 'Anthropic Claude',
          description: 'Claude AI models for conversation',
          keyFormat: 'sk-ant-...',
          models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']
        };
      default:
        return { name: '', description: '', keyFormat: '', models: [] };
    }
  };

  const info = getProviderInfo(provider);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Configure {info.name}
        </CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="apiKey"
              type="password"
              placeholder={`Enter your ${info.name} API key (${info.keyFormat})`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleValidateKey}
              disabled={isValidating || !apiKey.trim()}
              variant="outline"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Validate'
              )}
            </Button>
          </div>
          
          {validationResult !== null && (
            <Alert variant={validationResult ? "default" : "destructive"}>
              {validationResult ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {validationResult 
                  ? 'API key is valid and working!' 
                  : 'API key validation failed. Please check your key.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model (Optional)</Label>
          <Input
            id="model"
            placeholder={`Default: ${getDefaultModel(provider)}`}
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {info.models.map((model) => (
              <Badge 
                key={model} 
                variant="outline" 
                className="cursor-pointer hover:bg-muted"
                onClick={() => setModelName(model)}
              >
                {model}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSaveConfig}
          disabled={!validationResult || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            `Save ${info.name} Configuration`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}