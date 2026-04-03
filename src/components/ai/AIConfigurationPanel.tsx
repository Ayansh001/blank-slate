import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Brain, Key, CheckCircle, AlertCircle, Loader2, Settings } from 'lucide-react';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { AIServiceProvider } from '@/features/ai/types';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { toast } from 'sonner';

export function AIConfigurationPanel() {
  const { configs, activeConfig, saveConfig, setActiveService, validateAPIKey, testAPIKey, isSaving, serviceCapabilities } = useAIConfig();
  const [selectedService, setSelectedService] = useState<AIServiceProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const availableServices: { id: AIServiceProvider; name: string; description: string }[] = [
    { id: 'openai', name: 'OpenAI', description: 'GPT-4 and GPT-3.5 models' },
    { id: 'anthropic', name: 'Anthropic', description: 'Claude models' },
    { id: 'gemini', name: 'Google Gemini', description: 'Gemini models' }
  ];

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

      const defaultModel = serviceCapabilities[selectedService]?.models[0] || '';
      
      await setActiveService({
        service_name: selectedService,
        api_key: apiKey,
        model_name: modelName || defaultModel,
        is_active: true
      });

      setApiKey('');
      setModelName('');
      toast.success('AI service configured successfully!');
    } catch (error) {
      console.error('Config save error:', error);
      setValidationError('Failed to configure AI service. Please try again.');
      toast.error('Failed to configure AI service');
    } finally {
      setIsValidating(false);
    }
  };

  const toggleServiceActive = async (serviceId: string, enabled: boolean) => {
    const config = configs.find(c => c.id === serviceId);
    if (!config) return;

    try {
      await setActiveService({
        ...config,
        is_active: enabled
      });
      toast.success(enabled ? 'AI service activated' : 'AI service deactivated');
    } catch (error) {
      toast.error('Failed to update service status');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Service Configuration
          </CardTitle>
          <CardDescription>
            Configure and manage your AI service providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Service Status */}
          {activeConfig && (
            <Alert>
              <div className="flex items-center gap-2">
                <AIProviderLogo provider={activeConfig.service_name as AIServiceProvider} size="sm" />
                <CheckCircle className="h-4 w-4" />
              </div>
              <AlertDescription>
                Currently using {activeConfig.service_name} with model {activeConfig.model_name}
              </AlertDescription>
            </Alert>
          )}

          {/* Service Configuration Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>AI Service Provider</Label>
              <Select value={selectedService} onValueChange={(value) => setSelectedService(value as AIServiceProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <AIProviderLogo provider={service.id} size="sm" />
                        <span>{service.name} - {service.description}</span>
                      </div>
                    </SelectItem>
                  ))}
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
                  selectedService === 'openai' ? 'sk-...' : 
                  selectedService === 'anthropic' ? 'sk-ant-...' : 
                  'AIzaSy...'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {serviceCapabilities[selectedService] && (
              <div className="space-y-2">
                <Label>Model (Optional)</Label>
                <Select value={modelName} onValueChange={setModelName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model or leave empty for default" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCapabilities[selectedService].models.map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))
                  }
                  </SelectContent>
                </Select>
              </div>
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSaveConfig}
              disabled={isSaving || isValidating}
              className="w-full"
            >
              {isSaving || isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isValidating ? 'Validating...' : 'Saving...'}
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Configurations */}
      {configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configured Services</CardTitle>
            <CardDescription>
              Manage your existing AI service configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configs.map((config) => (
              <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AIProviderLogo provider={config.service_name as AIServiceProvider} size="md" />
                  <div>
                    <div className="font-medium capitalize">{config.service_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Model: {config.model_name || 'Default'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={config.is_active || false}
                    onCheckedChange={(checked) => toggleServiceActive(config.id!, checked)}
                  />
                  {config.is_active && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
