
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motivationalQuoteService, Quote, QuoteTrigger } from '@/services/MotivationalQuoteService';

interface QuoteToastOptions {
  showAuthor?: boolean;
  showCategory?: boolean;
  duration?: number;
  showSaveAction?: boolean;
}

export function useMotivationalQuotes() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(motivationalQuoteService.getPreferences());
  const [aiQuotes, setAiQuotes] = useState<any[]>([]);

  const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  // Fetch AI quotes for fallback
  useEffect(() => {
    if (user) {
      fetchAIQuotes();
    }
  }, [user]);

  const fetchAIQuotes = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('ai_daily_quotes')
        .select('*')
        .eq('user_id', user.id)
        .eq('generated_date', today)
        .eq('is_read', false)
        .limit(5);

      if (data) {
        setAiQuotes(data);
      }
    } catch (error) {
      console.error('Error fetching AI quotes:', error);
    }
  }, [user]);

  const showQuoteToast = useCallback((trigger: QuoteTrigger, options: QuoteToastOptions = {}) => {
    // Old quote system disabled - only use static quotes as emergency fallback
    // The new useSimpleAIQuotes handles all AI quote functionality
    
    // Don't auto-trigger - only show static quotes if explicitly requested
    if (preferences.frequency === 'off') return;
    
    const quote = motivationalQuoteService.getQuoteForTrigger(trigger, getTimeOfDay());
    if (!quote) return;

    const {
      showAuthor = true,
      duration = 4000,
      showSaveAction = false
    } = options;

    toast.success(quote.text, {
      description: showAuthor ? `📝 ${quote.author} • static backup` : undefined,
      duration,
      action: showSaveAction ? {
        label: '💝 Save',
        onClick: () => {
          const favorites = JSON.parse(localStorage.getItem('favorite_quotes') || '[]');
          if (!favorites.some((fav: Quote) => fav.id === quote.id)) {
            favorites.push(quote);
            localStorage.setItem('favorite_quotes', JSON.stringify(favorites));
            toast.success('Quote saved to favorites!', { duration: 2000 });
          }
        }
      } : undefined,
      className: 'border-l-4 border-l-gray-500'
    });
  }, [preferences.frequency]);

  // Disabled auto-triggers to prevent conflicts with new AI quote system
  const triggerSessionStartQuote = useCallback(() => {
    // Disabled - use useSimpleAIQuotes instead
  }, []);

  const triggerSessionEndQuote = useCallback(() => {
    // Disabled - use useSimpleAIQuotes instead
  }, []);

  const triggerMilestoneQuote = useCallback(() => {
    // Disabled - use useSimpleAIQuotes instead
  }, []);

  const triggerBreakTimeQuote = useCallback(() => {
    // Disabled - use useSimpleAIQuotes instead
  }, []);

  const triggerActivityQuote = useCallback(() => {
    // Disabled - use useSimpleAIQuotes instead
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<typeof preferences>) => {
    motivationalQuoteService.savePreferences(newPreferences);
    setPreferences({ ...preferences, ...newPreferences });
  }, [preferences]);

  return {
    triggerSessionStartQuote,
    triggerSessionEndQuote,
    triggerMilestoneQuote,
    triggerBreakTimeQuote,
    triggerActivityQuote,
    preferences,
    updatePreferences,
    categories: motivationalQuoteService.getCategories(),
    aiQuotes,
    fetchAIQuotes
  };
}
