import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationService } from '@/services/NotificationService';

interface SessionData {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  activityType: string;
  totalTime: number;
  isActive: boolean;
  breaks: Array<{ start: Date; end?: Date; duration?: number }>;
  activities: Array<{
    type: 'note_created' | 'file_uploaded' | 'ai_query' | 'content_viewed';
    timestamp: Date;
    data: any;
  }>;
}

export function useSessionTracker() {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const activityTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<Date>(new Date());

  // Auto-detect breaks (no activity for 5+ minutes)
  const BREAK_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  const AUTO_END_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  const saveSessionToLocal = useCallback((session: SessionData) => {
    const sessions = JSON.parse(localStorage.getItem('study_sessions') || '[]');
    const existingIndex = sessions.findIndex((s: SessionData) => s.sessionId === session.sessionId);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem('study_sessions', JSON.stringify(sessions));
  }, []);

  const syncSessionToDatabase = useCallback(async (session: SessionData) => {
    if (!user) return;

    try {
      const sessionData = {
        user_id: user.id,
        activity_type: session.activityType,
        started_at: session.startTime.toISOString(),
        ended_at: session.endTime?.toISOString(),
        duration_minutes: Math.round(session.totalTime / 60000),
        ai_queries: session.activities.filter(a => a.type === 'ai_query').length,
        notes_created: session.activities.filter(a => a.type === 'note_created').length,
        files_uploaded: session.activities.filter(a => a.type === 'file_uploaded').length,
        words_written: session.activities
          .filter(a => a.type === 'note_created')
          .reduce((total, a) => total + (a.data?.wordCount || 0), 0)
      };

      await supabase.from('study_sessions').upsert(sessionData);

      // Track learning analytics
      await supabase.rpc('track_learning_activity', {
        _user_id: user.id,
        _activity_type: 'study_session',
        _activity_data: {
          session_id: session.sessionId,
          activities: session.activities.map(a => ({
            type: a.type,
            timestamp: a.timestamp.toISOString(),
            data: a.data
          })),
          breaks: session.breaks.map(b => ({
            start: b.start.toISOString(),
            end: b.end?.toISOString(),
            duration: b.duration
          })),
          productivity_score: calculateProductivityScore(session)
        },
        _time_spent_minutes: Math.round(session.totalTime / 60000),
        _knowledge_areas: extractKnowledgeAreas(session.activities)
      });

      // Trigger study milestone notifications
      const durationMinutes = Math.round(session.totalTime / 60000);
      const productivityScore = calculateProductivityScore(session);
      
      if (durationMinutes >= 60) {
        NotificationService.studyMilestone(
          'Extended Study Session',
          `You've been studying for ${durationMinutes} minutes with ${productivityScore}% productivity!`
        );
      } else if (durationMinutes >= 30) {
        NotificationService.studyMilestone(
          'Focused Study Session',
          `Great job! You completed a ${durationMinutes}-minute study session.`
        );
      }

      if (session.activities.length >= 10) {
        NotificationService.studyMilestone(
          'Active Learning',
          `Excellent! You completed ${session.activities.length} learning activities this session.`
        );
      }
    } catch (error) {
      console.error('Failed to sync session to database:', error);
    }
  }, [user]);

  const calculateProductivityScore = (session: SessionData): number => {
    const totalBreakTime = session.breaks.reduce((total, brk) => 
      total + (brk.duration || 0), 0);
    const activeTime = session.totalTime - totalBreakTime;
    const activityDensity = session.activities.length / (session.totalTime / 60000);
    
    // Score based on active time ratio and activity density
    const activeRatio = activeTime / session.totalTime;
    const normalizedDensity = Math.min(activityDensity / 10, 1); // Normalize to 0-1
    
    return Math.round((activeRatio * 0.7 + normalizedDensity * 0.3) * 100);
  };

  const extractKnowledgeAreas = (activities: SessionData['activities']): string[] => {
    const areas = new Set<string>();
    activities.forEach(activity => {
      if (activity.data?.category) areas.add(activity.data.category);
      if (activity.data?.tags) activity.data.tags.forEach((tag: string) => areas.add(tag));
    });
    return Array.from(areas);
  };

  const startSession = useCallback((activityType: string = 'general') => {
    if (currentSession?.isActive) {
      endSession();
    }

    const newSession: SessionData = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      activityType,
      totalTime: 0,
      isActive: true,
      breaks: [],
      activities: []
    };

    setCurrentSession(newSession);
    setIsTracking(true);
    lastActivityRef.current = new Date();
    
    saveSessionToLocal(newSession);
  }, [currentSession, saveSessionToLocal]);

  const endSession = useCallback(() => {
    if (!currentSession) return;

    const endTime = new Date();
    const totalTime = endTime.getTime() - currentSession.startTime.getTime();
    
    // Check if there's an ongoing break
    const lastBreak = currentSession.breaks[currentSession.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = endTime;
      lastBreak.duration = endTime.getTime() - lastBreak.start.getTime();
    }

    const finalSession: SessionData = {
      ...currentSession,
      endTime,
      totalTime,
      isActive: false
    };

    setCurrentSession(finalSession);
    setIsTracking(false);
    
    saveSessionToLocal(finalSession);
    syncSessionToDatabase(finalSession);

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
  }, [currentSession, saveSessionToLocal, syncSessionToDatabase]);

  const recordActivity = useCallback((
    type: SessionData['activities'][0]['type'], 
    data: any = {}
  ) => {
    if (!currentSession?.isActive) return;

    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
    
    // Check if we need to end a break
    const lastBreak = currentSession.breaks[currentSession.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = now;
      lastBreak.duration = now.getTime() - lastBreak.start.getTime();
    }

    const newActivity = {
      type,
      timestamp: now,
      data
    };

    const updatedSession = {
      ...currentSession,
      activities: [...currentSession.activities, newActivity],
      totalTime: now.getTime() - currentSession.startTime.getTime()
    };

    setCurrentSession(updatedSession);
    lastActivityRef.current = now;
    saveSessionToLocal(updatedSession);

    // Trigger activity-specific notifications
    if (type === 'note_created' && data?.wordCount > 500) {
      NotificationService.create('study_milestone', {
        title: 'Productive Writing',
        message: `You've written ${data.wordCount} words in your notes!`,
        data: { activityType: 'writing', wordCount: data.wordCount }
      });
    }

    if (type === 'ai_query' && updatedSession.activities.filter(a => a.type === 'ai_query').length % 5 === 0) {
      NotificationService.create('study_milestone', {
        title: 'AI Learning Streak',
        message: `You've made ${updatedSession.activities.filter(a => a.type === 'ai_query').length} AI queries this session!`,
        data: { activityType: 'ai_usage', queryCount: updatedSession.activities.filter(a => a.type === 'ai_query').length }
      });
    }

    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Set timeout for break detection
    activityTimeoutRef.current = setTimeout(() => {
      if (currentSession?.isActive) {
        const breakStart = new Date();
        const sessionWithBreak = {
          ...updatedSession,
          breaks: [...updatedSession.breaks, { start: breakStart }]
        };
        setCurrentSession(sessionWithBreak);
        saveSessionToLocal(sessionWithBreak);
      }
    }, BREAK_THRESHOLD);
  }, [currentSession, saveSessionToLocal]);

  const pauseSession = useCallback(() => {
    if (!currentSession?.isActive) return;
    
    const now = new Date();
    const sessionWithBreak = {
      ...currentSession,
      breaks: [...currentSession.breaks, { start: now }]
    };
    
    setCurrentSession(sessionWithBreak);
    saveSessionToLocal(sessionWithBreak);
  }, [currentSession, saveSessionToLocal]);

  const resumeSession = useCallback(() => {
    if (!currentSession) return;
    
    const now = new Date();
    const lastBreak = currentSession.breaks[currentSession.breaks.length - 1];
    
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = now;
      lastBreak.duration = now.getTime() - lastBreak.start.getTime();
      
      const updatedSession = { ...currentSession };
      setCurrentSession(updatedSession);
      saveSessionToLocal(updatedSession);
    }
    
    lastActivityRef.current = now;
  }, [currentSession, saveSessionToLocal]);

  // Auto-end session after extended inactivity
  useEffect(() => {
    if (!isTracking || !currentSession) return;

    const checkAutoEnd = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current.getTime();
      if (timeSinceLastActivity > AUTO_END_THRESHOLD) {
        endSession();
      }
    };

    const interval = setInterval(checkAutoEnd, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isTracking, currentSession, endSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  const getSessionStats = useCallback(() => {
    if (!currentSession) return null;

    const now = new Date();
    const totalTime = currentSession.isActive 
      ? now.getTime() - currentSession.startTime.getTime()
      : currentSession.totalTime;

    const totalBreakTime = currentSession.breaks.reduce((total, brk) => {
      const breakDuration = brk.duration || 
        (brk.end ? brk.end.getTime() - brk.start.getTime() : 
         now.getTime() - brk.start.getTime());
      return total + breakDuration;
    }, 0);

    const activeTime = totalTime - totalBreakTime;
    const productivity = calculateProductivityScore({
      ...currentSession,
      totalTime,
      breaks: currentSession.breaks.map(brk => ({
        ...brk,
        duration: brk.duration || (brk.end ? brk.end.getTime() - brk.start.getTime() : 0)
      }))
    });

    return {
      totalTime: Math.round(totalTime / 60000), // in minutes
      activeTime: Math.round(activeTime / 60000),
      breakTime: Math.round(totalBreakTime / 60000),
      productivity,
      activitiesCount: currentSession.activities.length,
      breaksCount: currentSession.breaks.length
    };
  }, [currentSession]);

  return {
    currentSession,
    isTracking,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    recordActivity,
    getSessionStats
  };
}
