import { useState, useEffect, useCallback, useRef } from 'react';
import { AdvancedQuizConfig, AdvancedQuestion } from '@/features/ai/types/advancedQuiz';
import { NotificationService } from '@/services/NotificationService';
import { logger } from '@/features/ai/utils/DebugLogger';

export interface QuizAutoSaveData {
  quizId: string;
  questionIndex: number;
  answers: any[];
  startTime: Date;
  elapsedSeconds: number;
  config: AdvancedQuizConfig;
  questions: AdvancedQuestion[];
  lastSaved: Date;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useQuizAutoSave(
  quizId: string,
  questionIndex: number,
  answers: any[],
  startTime: Date | null,
  elapsedSeconds: number,
  config: AdvancedQuizConfig | null,
  questions: AdvancedQuestion[]
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSaveRef = useRef<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  const STORAGE_KEY = `quiz_autosave_${quizId}`;

  const saveToStorage = useCallback(async () => {
    if (!startTime || !config) return;

    setSaveStatus('saving');
    
    try {
      const saveData: QuizAutoSaveData = {
        quizId,
        questionIndex,
        answers,
        startTime,
        elapsedSeconds,
        config,
        questions,
        lastSaved: new Date()
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      lastSaveRef.current = new Date();
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      logger.info('useQuizAutoSave', 'Quiz progress saved', {
        questionIndex,
        answersCount: answers.filter(a => a !== null).length,
        elapsedSeconds
      });

      // Trigger quiz auto-save notification (less frequent to avoid spam)
      if (questionIndex > 0 && questionIndex % 5 === 0) {
        NotificationService.create('system_alert', {
          title: 'Quiz Progress Saved',
          message: `Your quiz progress has been automatically saved (Question ${questionIndex + 1}/${questions.length})`,
          priority: 'low',
          data: { quizId, questionIndex, totalQuestions: questions.length }
        });
      }

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      logger.error('useQuizAutoSave', 'Failed to save quiz progress', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [quizId, questionIndex, answers, startTime, elapsedSeconds, config, questions]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!startTime || !config) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        saveToStorage();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [saveToStorage, hasUnsavedChanges, startTime, config]);

  // Save immediately when answers change
  useEffect(() => {
    if (lastSaveRef.current && startTime) {
      setHasUnsavedChanges(true);
      
      // Debounce immediate saves by 2 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveToStorage();
      }, 2000);
    }
  }, [answers, saveToStorage, startTime]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && startTime) {
        saveToStorage();
        e.preventDefault();
        e.returnValue = 'You have unsaved quiz progress. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, saveToStorage, startTime]);

  const loadSavedQuiz = useCallback((): QuizAutoSaveData | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as QuizAutoSaveData;
        // Convert date strings back to Date objects
        data.startTime = new Date(data.startTime);
        data.lastSaved = new Date(data.lastSaved);
        return data;
      }
    } catch (error) {
      logger.error('useQuizAutoSave', 'Failed to load saved quiz', error);
    }
    return null;
  }, [STORAGE_KEY]);

  const clearSavedQuiz = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHasUnsavedChanges(false);
      logger.info('useQuizAutoSave', 'Cleared saved quiz data');
      
      // Note: Quiz completion notification is now handled by the main quiz components
      // to prevent duplicate notifications and ensure consistency
    } catch (error) {
      logger.error('useQuizAutoSave', 'Failed to clear saved quiz', error);
    }
  }, [STORAGE_KEY]);

  const forceSave = useCallback(() => {
    saveToStorage();
  }, [saveToStorage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    hasUnsavedChanges,
    loadSavedQuiz,
    clearSavedQuiz,
    forceSave,
    lastSaved: lastSaveRef.current
  };
}
