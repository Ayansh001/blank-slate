import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2 } from 'lucide-react';
import { useAIProvider } from '../hooks/useAIProvider';
import { AIProvider } from '../types/providers';

interface ProviderSwitcherProps {
  className?: string;
}

const providerLabels: Record<AIProvider, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  anthropic: 'Claude (Anthropic)',
};

const providerIcons: Record<AIProvider, string> = {
  openai: '🤖',
  gemini: '🔮',
  anthropic: '🎭',
};

export const ProviderSwitcher: React.FC<ProviderSwitcherProps> = ({ className }) => {
  const { selectedProvider, availableProviders, isLoading, switchProvider } = useAIProvider();

  const handleProviderChange = async (provider: AIProvider) => {
    if (provider !== selectedProvider) {
      await switchProvider(provider);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Bot className="w-4 h-4 text-muted-foreground" />
      <Select
        value={selectedProvider || ''}
        onValueChange={handleProviderChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select AI Provider">
            {selectedProvider && (
              <div className="flex items-center gap-2">
                <span>{providerIcons[selectedProvider]}</span>
                <span>{providerLabels[selectedProvider]}</span>
                {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableProviders.map((provider) => (
            <SelectItem key={provider} value={provider}>
              <div className="flex items-center gap-2">
                <span>{providerIcons[provider]}</span>
                <span>{providerLabels[provider]}</span>
                {provider === selectedProvider && (
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};