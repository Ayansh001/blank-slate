
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AIProviderLogo } from '@/components/ui/AIProviderLogo';
import { 
  Bot, 
  CheckCircle, 
  Settings2, 
  Zap,
  ChevronDown
} from 'lucide-react';
import { useAIConfig } from '../hooks/useAIConfig';
import { AIServiceProvider } from '../types';

export function QuickServiceSwitcher() {
  const { configs, activeConfig, toggleService, isSaving } = useAIConfig();
  const [isOpen, setIsOpen] = useState(false);

  // Get configured services
  const configuredServices = configs.filter(config => config.api_key);
  const activeServices = configuredServices.filter(config => config.is_active);

  const getServiceIcon = (serviceName: string) => {
    return (
      <AIProviderLogo 
        provider={serviceName as AIServiceProvider} 
        size="sm" 
        className="inline-block"
      />
    );
  };

  const getServiceDisplayName = (serviceName: string) => {
    switch (serviceName) {
      case 'openai': return 'ChatGPT';
      case 'gemini': return 'Gemini';
      case 'anthropic': return 'Claude';
      default: return serviceName;
    }
  };

  const handleServiceToggle = async (serviceId: string, enabled: boolean) => {
    await toggleService(serviceId, enabled);
  };

  if (configuredServices.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={isSaving}
        >
          <Bot className="h-4 w-4" />
          {activeConfig ? (
            <>
              <AIProviderLogo 
                provider={activeConfig.service_name as AIServiceProvider} 
                size="sm"
                className="inline-block"
              />
              <span className="hidden sm:inline">
                {getServiceDisplayName(activeConfig.service_name)}
              </span>
            </>
          ) : (
            <span>AI Services</span>
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <h4 className="font-medium">AI Services</h4>
          </div>
          
          <div className="space-y-3">
            {configuredServices.map((config) => (
              <div
                key={config.id}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  config.is_active 
                    ? 'bg-muted/50 border-primary/20' 
                    : 'border-border/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`${!config.is_active ? 'grayscale opacity-60' : ''}`}>
                    <AIProviderLogo 
                      provider={config.service_name as AIServiceProvider} 
                      size="md"
                      className="inline-block"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {getServiceDisplayName(config.service_name)}
                      </span>
                      {config.is_active && (
                        <Badge variant="default" className="text-xs px-1 py-0">
                          Active
                        </Badge>
                      )}
                      {activeConfig?.id === config.id && (
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {config.model_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config.is_active && (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  <Switch
                    checked={config.is_active}
                    onCheckedChange={(checked) => handleServiceToggle(config.id, checked)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            ))}
          </div>

          {activeServices.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Settings2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active services</p>
              <p className="text-xs">Enable at least one service to start chatting</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
