
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Quote, Heart, Zap } from 'lucide-react';
import { useSimpleAIQuotes } from '@/hooks/useSimpleAIQuotes';
import { useState } from 'react';

export function QuotePreferencesPanel() {
  const { showNextQuote, isLoading } = useSimpleAIQuotes(false); // Disable auto-trigger on settings
  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem('favorite_quotes') || '[]');
  });

  const handleTestQuote = () => {
    showNextQuote();
  };

  const clearFavorites = () => {
    localStorage.removeItem('favorite_quotes');
    setFavorites([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Daily Quotes
          </CardTitle>
          <CardDescription>
            Get personalized AI-generated motivational quotes during your study sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Quote Status */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">AI Quote System</Label>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Quotes Enabled</span>
                </div>
                <Button 
                  onClick={handleTestQuote} 
                  size="sm"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Show Quote'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                AI quotes automatically appear during study sessions, file uploads, and note creation
              </p>
            </div>
          </div>

          {/* Favorite Quotes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Favorite Quotes ({favorites.length})
              </Label>
              {favorites.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFavorites}>
                  Clear All
                </Button>
              )}
            </div>
            
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Save quotes by clicking the 💝 Save button when they appear
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {favorites.map((quote: any) => (
                  <div
                    key={quote.id}
                    className="p-3 rounded-lg border bg-muted/30 text-sm"
                  >
                    <div className="font-medium mb-1">"{quote.text}"</div>
                    <div className="text-muted-foreground">— {quote.author}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
