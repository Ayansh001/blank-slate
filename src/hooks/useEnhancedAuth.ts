
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSimpleAIQuotes } from './useSimpleAIQuotes';
import { useCallback, useEffect, useRef } from 'react';

export function useEnhancedAuth() {
  const auth = useAuth();
  const quotes = useSimpleAIQuotes();
  const hasShownLoginQuote = useRef(false);
  const loginTimeoutRef = useRef<NodeJS.Timeout>();

  // Trigger welcome quote on successful login
  useEffect(() => {
    // Clear any existing timeout
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = undefined;
    }

    // Show welcome quote after successful login (once per session)
    if (auth.user && !hasShownLoginQuote.current) {
      hasShownLoginQuote.current = true;
      loginTimeoutRef.current = setTimeout(() => {
        quotes.showNextQuote();
      }, 3000); // 3 second delay after login
    }
    
    // Reset flag when user logs out
    if (!auth.user) {
      hasShownLoginQuote.current = false;
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = undefined;
      }
    }
  }, [auth.user?.id, quotes]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...auth,
    quotes
  };
}
