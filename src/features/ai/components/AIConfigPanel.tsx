// AI Configuration Panel - Manages user AI service settings
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Key, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { useAIConfig } from '../hooks/useAIConfig';
import { AIServiceProvider } from '../types';

export function AIConfigPanel() {
  const { 
    configs, 
    activeConfig, 
    serviceCapabilities, 
    saveConfig, 
    setActiveService, 
    validateAPIKey, 
    isSaving 
  } = useAIConfig();

  const [newConfig, setNewConfig] = useState({
    service_name: '' as AIServiceProvider | '',
    api_key: '',
    model_name: ''
  });

  const [validationError, setValidationError] = useState('');

  const handleSaveConfig = async () => {
    if (!newConfig.service_name || !newConfig.api_key || !newConfig.model_name) {
      setValidationError('Please fill in all required fields');
      return;
    }

    if (!validateAPIKey(newConfig.service_name as AIServiceProvider, newConfig.api_key)) {
      setValidationError('Invalid API key format');
      return;
    }

    setValidationError('');
    
    await setActiveService({
      service_name: newConfig.service_name,
      api_key: newConfig.api_key, // Store API key directly for personal use
      model_name: newConfig.model_name
    });

    setNewConfig({ service_name: '', api_key: '', model_name: '' });
  };

  const getServiceModels = (service: AIServiceProvider) => {
    return serviceCapabilities[service]?.models || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">AI Configuration</h2>
          <p className="text-muted-foreground">Configure your AI services for document analysis</p>
        </div>
      </div>

      {/* Current Active Service */}
      {activeConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Active AI Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="default" className="mb-2">
                  {activeConfig.service_name.toUpperCase()}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Model: {activeConfig.model_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Status: Active</p>
                <p className="text-xs text-muted-foreground">
                  Added: {new Date(activeConfig.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Service */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {activeConfig ? 'Change AI Service' : 'Setup AI Service'}
          </CardTitle>
          <CardDescription>
            Configure your preferred AI service for document analysis
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
            <Label htmlFor="service">AI Service</Label>
            <Select 
              value={newConfig.service_name} 
              onValueChange={(value) => {
                setNewConfig(prev => ({ 
                  ...prev, 
                  service_name: value as AIServiceProvider,
                  model_name: '' // Reset model when service changes
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI (GPT-4o, GPT-4o Mini)</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="gemini">Google Gemini (2.0 Flash, 1.5 Pro)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newConfig.service_name && (
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select 
                value={newConfig.model_name} 
                onValueChange={(value) => setNewConfig(prev => ({ ...prev, model_name: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {getServiceModels(newConfig.service_name as AIServiceProvider).map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={newConfig.api_key}
              onChange={(e) => setNewConfig(prev => ({ ...prev, api_key: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Your API key will be encrypted and stored securely
            </p>
          </div>

          <Button 
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Service Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Service Capabilities</CardTitle>
          <CardDescription>
            Compare features and pricing of different AI services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(serviceCapabilities).map(([service, capabilities]) => (
              <div key={service} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{service.toUpperCase()}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {capabilities.maxTokens.toLocaleString()} max tokens
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Models: {capabilities.models.length}</div>
                  <div>Vision: {capabilities.supportsVision ? '✓' : '✗'}</div>
                  <div>Streaming: {capabilities.supportsStreaming ? '✓' : '✗'}</div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    Cost: ${capabilities.costPerToken.input.toFixed(6)}/input token, 
                    ${capabilities.costPerToken.output.toFixed(6)}/output token
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}