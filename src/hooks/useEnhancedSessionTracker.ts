
import { useSessionTracker } from './useSessionTracker';
import { useSimpleAIQuotes } from './useSimpleAIQuotes';
import { useCallback, useEffect, useRef } from 'react';

export function useEnhancedSessionTracker() {
  const sessionTracker = useSessionTracker();
  const quotes = useSimpleAIQuotes();
  const milestoneTrackerRef = useRef<{ lastMilestone: number }>({ lastMilestone: 0 });

  // Enhanced start session with quote
  const startSessionWithQuote = useCallback((activityType: string = 'general') => {
    sessionTracker.startSession(activityType);
    
    // Show motivational quote after a short delay
    setTimeout(() => {
      quotes.showNextQuote();
    }, 2000);
  }, [sessionTracker, quotes]);

  // Enhanced end session with quote
  const endSessionWithQuote = useCallback(() => {
    const stats = sessionTracker.getSessionStats();
    sessionTracker.endSession();
    
    // Show congratulatory quote if session was substantial
    if (stats && stats.totalTime >= 10) { // 10+ minutes
      setTimeout(() => {
        quotes.showNextQuote();
      }, 1000);
    }
  }, [sessionTracker, quotes]);

  // Monitor for milestones and trigger quotes
  useEffect(() => {
    const stats = sessionTracker.getSessionStats();
    if (!stats) return;

    const currentMilestone = Math.floor(stats.totalTime / 30); // Every 30 minutes
    
    if (currentMilestone > milestoneTrackerRef.current.lastMilestone && currentMilestone > 0) {
      milestoneTrackerRef.current.lastMilestone = currentMilestone;
      quotes.showNextQuote();
    }
  }, [sessionTracker.getSessionStats, quotes]);

  // Enhanced pause with break quote
  const pauseSessionWithQuote = useCallback(() => {
    sessionTracker.pauseSession();
    
    // Show break time quote after a delay (occasionally)
    if (Math.random() > 0.6) {
      setTimeout(() => {
        quotes.showNextQuote();
      }, 3000);
    }
  }, [sessionTracker, quotes]);

  return {
    ...sessionTracker,
    startSession: startSessionWithQuote,
    endSession: endSessionWithQuote,
    pauseSession: pauseSessionWithQuote,
    quotes
  };
}
