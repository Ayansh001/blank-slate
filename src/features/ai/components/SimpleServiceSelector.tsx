import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAIConfig } from '../hooks/useAIConfig';
import { AIServiceProvider } from '../types';
import { toast } from 'sonner';

export function SimpleServiceSelector() {
  const { activeConfig, setActiveService, validateAPIKey, testAPIKey, isSaving } = useAIConfig();
  const [selectedService, setSelectedService] = useState<AIServiceProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      setValidationError('Please enter your API key');
      return;
    }

    if (!validateAPIKey(selectedService, apiKey)) {
      setValidationError('Invalid API key format');
      return;
    }

    setIsValidating(true);
    setValidationError('');
    
    try {
      const isValid = await testAPIKey(selectedService, apiKey);
      if (!isValid) {
        setValidationError('API key validation failed. Please check your key and try again.');
        return;
      }

      const modelName = selectedService === 'openai' ? 'gpt-4.1-mini-2025-04-14' : 'gemini-2.0-flash';
      
      await setActiveService({
        service_name: selectedService,
        api_key: apiKey,
        model_name: modelName,
        is_active: true
      });

      setApiKey('');
      toast.success('AI service connected successfully!');
    } catch (error) {
      console.error('Config save error:', error);
      setValidationError('Failed to validate API key. Please try again.');
      toast.error('Failed to connect AI service');
    } finally {
      setIsValidating(false);
    }
  };

  if (activeConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Connected to {activeConfig.service_name === 'openai' ? 'ChatGPT' : 'Gemini'}
          </CardTitle>
          <CardDescription>
            Using {activeConfig.model_name} • Ready to chat
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Choose Your AI Assistant
        </CardTitle>
        <CardDescription>
          Select ChatGPT or Gemini and enter your API key to get started
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
          <Label>AI Service</Label>
          <Select value={selectedService} onValueChange={(value) => setSelectedService(value as AIServiceProvider)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                ChatGPT (GPT-4o Mini) - Fast & Reliable
              </SelectItem>
              <SelectItem value="gemini">
                Google Gemini (2.0 Flash) - Advanced & Free
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
            placeholder={selectedService === 'openai' ? 'sk-...' : 'AIzaSy...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {selectedService === 'openai' 
              ? 'Get your key from platform.openai.com'
              : 'Get your key from Google AI Studio'
            }
          </p>
        </div>

        <Button 
          onClick={handleSaveConfig}
          disabled={isSaving || isValidating}
          className="w-full"
        >
          {isSaving || isValidating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {isValidating ? 'Validating...' : 'Connecting...'}
            </>
          ) : (
            'Connect & Start Chatting'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}