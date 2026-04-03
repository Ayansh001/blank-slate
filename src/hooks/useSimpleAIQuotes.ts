import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';

interface DailyQuote {
  id: string;
  quote_text: string;
  category: string;
  ai_service: string;
  model_used: string;
  is_read: boolean;
}

export function useSimpleAIQuotes(autoTrigger: boolean = true) {
  const { user } = useAuth();
  const { createNotification } = useNotifications();
  const [quotes, setQuotes] = useState<DailyQuote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownTodayQuote, setHasShownTodayQuote] = useState(false);

  // Get unread quotes
  const getUnreadQuotes = useCallback(async (): Promise<DailyQuote[]> => {
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('ai_daily_quotes')
      .select('*')
      .eq('user_id', user.id)
      .eq('generated_date', today)
      .eq('is_read', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching unread quotes:', error);
      return [];
    }

    return data || [];
  }, [user]);

  // Generate new quotes via edge function
  const generateNewQuotes = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      setIsLoading(true);
      console.log('🚀 Calling edge function to generate quotes...');

      const { data, error } = await supabase.functions.invoke('ai-quote-generator', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Edge function error:', error);
        return false;
      }

      console.log('✅ Edge function response:', data);
      return data?.success || false;
    } catch (error) {
      console.error('❌ Failed to generate quotes:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Show a quote with toast and notification
  const showQuote = useCallback(async (quote: DailyQuote) => {
    const isAIGenerated = quote.ai_service !== 'fallback';
    const icon = isAIGenerated ? '🤖' : '💫';
    const source = isAIGenerated ? `AI ${quote.ai_service}` : 'Curated';

    // Create notification
    try {
      await createNotification({
        type: 'daily_quote',
        title: 'Daily Motivation',
        message: quote.quote_text,
        data: {
          quote_id: quote.id,
          category: quote.category,
          source: source,
          ai_service: quote.ai_service
        }
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }

    // Show toast with save functionality
    toast.success(quote.quote_text, {
      description: `${icon} ${source} • ${quote.category}`,
      duration: 6000,
      action: {
        label: '💝 Save',
        onClick: () => saveToFavorites(quote)
      },
      className: isAIGenerated 
        ? 'border-l-4 border-l-purple-500'
        : 'border-l-4 border-l-blue-500'
    });

    // Mark as read
    await markAsRead(quote.id);
  }, [createNotification]);

  // Mark quote as read
  const markAsRead = useCallback(async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('ai_daily_quotes')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', quoteId);

      if (error) {
        console.error('Error marking quote as read:', error);
      }
    } catch (error) {
      console.error('Error marking quote as read:', error);
    }
  }, []);

  // Save quote to favorites
  const saveToFavorites = useCallback((quote: DailyQuote) => {
    const favorites = JSON.parse(localStorage.getItem('favorite_quotes') || '[]');
    const favoriteQuote = {
      id: quote.id,
      text: quote.quote_text,
      author: `${quote.ai_service} Quote`,
      category: quote.category
    };
    
    if (!favorites.some((fav: any) => fav.id === quote.id)) {
      favorites.push(favoriteQuote);
      localStorage.setItem('favorite_quotes', JSON.stringify(favorites));
      toast.success('Quote saved to favorites!', { duration: 2000 });
    }
  }, []);

  // Main function: check and show quote
  const checkAndShowQuote = useCallback(async () => {
    if (!user || hasShownTodayQuote) return;

    setIsLoading(true);
    console.log('🔍 Checking for unread quotes...');

    try {
      // 1. Check for unread quotes
      let unreadQuotes = await getUnreadQuotes();
      
      if (unreadQuotes.length > 0) {
        // 2. Show existing unread quote
        console.log(`📋 Found ${unreadQuotes.length} unread quotes, showing first one`);
        await showQuote(unreadQuotes[0]);
        setHasShownTodayQuote(true);
      } else {
        // 3. Generate new quotes if none exist
        console.log('🔄 No unread quotes found, generating new ones...');
        const success = await generateNewQuotes();
        
        if (success) {
          // 4. Get and show newly generated quote
          unreadQuotes = await getUnreadQuotes();
          if (unreadQuotes.length > 0) {
            console.log('✅ New quotes generated, showing first one');
            await showQuote(unreadQuotes[0]);
            setHasShownTodayQuote(true);
          }
        } else {
          console.log('❌ Failed to generate quotes');
          toast.error('Unable to load daily quotes');
        }
      }
    } catch (error) {
      console.error('❌ Error in checkAndShowQuote:', error);
      toast.error('Error loading quotes');
    } finally {
      setIsLoading(false);
    }
  }, [user, hasShownTodayQuote, getUnreadQuotes, generateNewQuotes, showQuote]);

  // Manual quote trigger
  const showNextQuote = useCallback(async () => {
    const unreadQuotes = await getUnreadQuotes();
    if (unreadQuotes.length > 0) {
      await showQuote(unreadQuotes[0]);
    } else {
      toast.info('No more quotes available today');
    }
  }, [getUnreadQuotes, showQuote]);

  // Auto-trigger on component mount (page refresh)
  useEffect(() => {
    if (user && !hasShownTodayQuote && autoTrigger) {
      const timer = setTimeout(() => {
        checkAndShowQuote();
      }, 2000); // Small delay to let page load

      return () => clearTimeout(timer);
    }
  }, [user, checkAndShowQuote, hasShownTodayQuote, autoTrigger]);

  // Reset daily flag when date changes
  useEffect(() => {
    const checkDate = () => {
      const lastShownDate = localStorage.getItem('last_quote_shown_date');
      const today = new Date().toISOString().split('T')[0];
      
      if (lastShownDate !== today) {
        setHasShownTodayQuote(false);
        localStorage.setItem('last_quote_shown_date', today);
      }
    };

    checkDate();
    const interval = setInterval(checkDate, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return {
    isLoading,
    showNextQuote,
    saveToFavorites,
    hasShownTodayQuote
  };
}