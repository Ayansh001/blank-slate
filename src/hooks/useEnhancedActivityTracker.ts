
import { useActivityTracker } from './useActivityTracker';
import { useSimpleAIQuotes } from './useSimpleAIQuotes';
import { useCallback } from 'react';

export function useEnhancedActivityTracker() {
  const activityTracker = useActivityTracker();
  const quotes = useSimpleAIQuotes();

  const trackNoteCreatedWithQuote = useCallback((noteData: { id: string; title: string; wordCount?: number }) => {
    activityTracker.trackNoteCreated(noteData);
    
    // Show quote for significant notes (100+ words) - occasionally to avoid spam
    if ((noteData.wordCount || 0) >= 100 && Math.random() > 0.7) {
      quotes.showNextQuote();
    }
  }, [activityTracker, quotes]);

  const trackFileUploadedWithQuote = useCallback((fileData: { id: string; name: string; type: string; size: number }) => {
    activityTracker.trackFileUploaded(fileData);
    
    // Show quote occasionally to avoid spam
    if (Math.random() > 0.8) {
      quotes.showNextQuote();
    }
  }, [activityTracker, quotes]);

  return {
    ...activityTracker,
    trackNoteCreated: trackNoteCreatedWithQuote,
    trackFileUploaded: trackFileUploadedWithQuote
  };
}
