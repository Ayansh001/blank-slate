import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAIConfig } from '../hooks/useAIConfig';
import { AIServiceProvider } from '../types';

export function ServiceSwitcher() {
  const { configs, activeConfig, setActiveService, isSaving } = useAIConfig();
  const [showInactive, setShowInactive] = useState(false);

  // Get available configured services
  const configuredServices = configs.filter(config => config.api_key);
  const activeServices = configuredServices.filter(config => config.is_active);
  const inactiveServices = configuredServices.filter(config => !config.is_active);

  const handleServiceToggle = async (config: any, enabled: boolean) => {
    if (enabled) {
      // Enable this service
      await setActiveService({
        ...config,
        is_active: true
      });
    } else {
      // Disable this service
      await setActiveService({
        ...config,
        is_active: false
      });
    }
  };

  const handleQuickSwitch = async (serviceId: string) => {
    const config = configuredServices.find(c => c.id === serviceId);
    if (config) {
      await setActiveService({
        ...config,
        is_active: true
      });
    }
  };

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'openai': return '🤖';
      case 'gemini': return '✨';
      case 'anthropic': return '🧠';
      default: return '🤖';
    }
  };

  const getServiceDisplayName = (serviceName: string) => {
    switch (serviceName) {
      case 'openai': return 'ChatGPT';
      case 'gemini': return 'Gemini';
      case 'anthropic': return 'Claude';
      default: return serviceName;
    }
  };

  if (configuredServices.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No AI services configured yet. Please set up at least one service to continue.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Switcher for Active Services */}
      {activeServices.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Quick Switch
            </CardTitle>
            <CardDescription>
              Switch between your active AI services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={activeConfig?.id || ''} 
              onValueChange={handleQuickSwitch}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select active service" />
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((config) => (
                  <SelectItem key={config.id} value={config.id}>
                    <div className="flex items-center gap-2">
                      <span>{getServiceIcon(config.service_name)}</span>
                      <span>{getServiceDisplayName(config.service_name)}</span>
                      <Badge variant="outline" className="text-xs">
                        {config.model_name}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Service Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Services
              </CardTitle>
              <CardDescription>
                Manage your configured AI services
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2"
            >
              {showInactive ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Inactive
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Active Services */}
            {activeServices.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getServiceIcon(config.service_name)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getServiceDisplayName(config.service_name)}
                      </span>
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                      {activeConfig?.id === config.id && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Model: {config.model_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Switch
                    checked={true}
                    onCheckedChange={(checked) => handleServiceToggle(config, checked)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ))}

            {/* Inactive Services */}
            {showInactive && inactiveServices.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-3 border rounded-lg opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl grayscale">{getServiceIcon(config.service_name)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getServiceDisplayName(config.service_name)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Model: {config.model_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={false}
                    onCheckedChange={(checked) => handleServiceToggle(config, checked)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ))}

            {configuredServices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No services configured yet</p>
                <p className="text-sm">Add your first AI service to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}