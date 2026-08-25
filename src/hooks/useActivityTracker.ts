
import { useCallback } from 'react';
import { useSessionTracker } from './useSessionTracker';

export function useActivityTracker() {
  const { recordActivity, isTracking } = useSessionTracker();

  const trackNoteCreated = useCallback((noteData: { id: string; title: string; wordCount?: number }) => {
    if (!isTracking) return;
    
    recordActivity('note_created', {
      type: 'note',
      id: noteData.id,
      title: noteData.title,
      wordCount: noteData.wordCount || 0
    });
  }, [recordActivity, isTracking]);

  const trackFileUploaded = useCallback((fileData: { id: string; name: string; type: string; size: number }) => {
    if (!isTracking) return;
    
    recordActivity('file_uploaded', {
      type: 'file',
      id: fileData.id,
      name: fileData.name,
      fileType: fileData.type,
      size: fileData.size
    });
  }, [recordActivity, isTracking]);

  const trackContentViewed = useCallback((contentData: { id: string; type: 'note' | 'file'; title?: string; name?: string }) => {
    if (!isTracking) return;
    
    recordActivity('content_viewed', {
      type: contentData.type,
      id: contentData.id,
      title: contentData.title || contentData.name
    });
  }, [recordActivity, isTracking]);

  const trackAIQuery = useCallback((queryData: { type: string; prompt?: string; response?: string }) => {
    if (!isTracking) return;
    
    recordActivity('ai_query', {
      queryType: queryData.type,
      hasPrompt: !!queryData.prompt,
      hasResponse: !!queryData.response
    });
  }, [recordActivity, isTracking]);

  return {
    trackNoteCreated,
    trackFileUploaded,
    trackContentViewed,
    trackAIQuery,
    isTracking
  };
}
