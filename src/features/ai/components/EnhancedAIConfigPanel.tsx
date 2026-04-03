import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Key, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAIConfig } from '../hooks/useAIConfig';
import { ServiceSwitcher } from './ServiceSwitcher';
import { AIServiceProvider } from '../types';

export function EnhancedAIConfigPanel() {
  const { 
    configs, 
    activeConfig, 
    serviceCapabilities, 
    saveConfig,
    toggleService,
    validateAPIKey, 
    isSaving 
  } = useAIConfig();

  const [newConfig, setNewConfig] = useState({
    service_name: '' as AIServiceProvider | '',
    api_key: '',
    model_name: ''
  });
  const [validationError, setValidationError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

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
    
    const configToSave = {
      service_name: newConfig.service_name,
      api_key: newConfig.api_key,
      model_name: newConfig.model_name,
      is_active: configs.length === 0 // Auto-activate if it's the first service
    };

    saveConfig(configToSave);
    setNewConfig({ service_name: '', api_key: '', model_name: '' });
  };

  const getServiceModels = (service: AIServiceProvider) => {
    return serviceCapabilities[service]?.models || [];
  };

  const getServiceDisplayName = (serviceName: string) => {
    switch (serviceName) {
      case 'openai': return 'ChatGPT';
      case 'gemini': return 'Gemini';
      case 'anthropic': return 'Claude';
      default: return serviceName;
    }
  };

  const configuredServices = configs.filter(config => config.api_key);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">AI Configuration</h2>
          <p className="text-muted-foreground">Configure and manage your AI services</p>
        </div>
      </div>

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manage">Manage Services</TabsTrigger>
          <TabsTrigger value="add">Add Service</TabsTrigger>
          <TabsTrigger value="capabilities">Service Info</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          {/* Current Active Service */}
          {activeConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Currently Active Service
                </CardTitle>
                <CardDescription>
                  This service is currently handling your AI requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="text-sm">
                        {getServiceDisplayName(activeConfig.service_name)}
                      </Badge>
                      <Badge variant="outline" className="text-sm">
                        {activeConfig.model_name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Added: {new Date(activeConfig.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Management */}
          <ServiceSwitcher />

          {configuredServices.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No AI Services Configured</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first AI service to start using the AI features
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add AI Service
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New AI Service
              </CardTitle>
              <CardDescription>
                Configure a new AI service for document analysis and chat
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
                    <SelectItem value="openai">
                      <div className="flex items-center gap-2">
                        <span>🤖</span>
                        <span>ChatGPT (OpenAI)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gemini">
                      <div className="flex items-center gap-2">
                        <span>✨</span>
                        <span>Gemini (Google)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="anthropic">
                      <div className="flex items-center gap-2">
                        <span>🧠</span>
                        <span>Claude (Anthropic)</span>
                      </div>
                    </SelectItem>
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
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder={
                      newConfig.service_name === 'openai' 
                        ? 'sk-...' 
                        : newConfig.service_name === 'gemini'
                        ? 'AIzaSy...'
                        : 'Enter your API key'
                    }
                    value={newConfig.api_key}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, api_key: e.target.value }))}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {newConfig.service_name === 'openai' && 'Get your key from platform.openai.com'}
                  {newConfig.service_name === 'gemini' && 'Get your key from Google AI Studio'}
                  {newConfig.service_name === 'anthropic' && 'Get your key from console.anthropic.com'}
                  {!newConfig.service_name && 'Your API key will be encrypted and stored securely'}
                </p>
              </div>

              <Button 
                onClick={handleSaveConfig}
                disabled={isSaving || !newConfig.service_name || !newConfig.api_key || !newConfig.model_name}
                className="w-full"
              >
                {isSaving ? 'Saving...' : 'Add AI Service'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {service === 'openai' ? '🤖' : service === 'gemini' ? '✨' : '🧠'}
                        </span>
                        <Badge variant="outline" className="font-medium">
                          {getServiceDisplayName(service)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {capabilities.maxTokens.toLocaleString()} max tokens
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Models:</span>
                        <span>{capabilities.models.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Vision:</span>
                        <span>{capabilities.supportsVision ? '✅' : '❌'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Streaming:</span>
                        <span>{capabilities.supportsStreaming ? '✅' : '❌'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="text-xs">
                          ${capabilities.costPerToken.input.toFixed(6)}/token
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {capabilities.models.map(model => (
                        <Badge key={model} variant="secondary" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}