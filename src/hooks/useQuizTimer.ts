
import { useState, useEffect, useCallback, useRef } from 'react';

interface QuizTimerState {
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  questionStartTime: Date | null;
  questionTimes: number[];
}

export function useQuizTimer(startTime: Date | null) {
  const [timerState, setTimerState] = useState<QuizTimerState>({
    elapsedSeconds: 0,
    isRunning: false,
    isPaused: false,
    questionStartTime: null,
    questionTimes: []
  });

  const intervalRef = useRef<NodeJS.Timeout>();

  // Debug logging
  console.log('useQuizTimer - startTime:', startTime);
  console.log('useQuizTimer - timerState:', timerState);

  // Start the timer
  const start = useCallback(() => {
    if (!startTime) {
      console.log('useQuizTimer - start: No startTime provided');
      return;
    }
    
    console.log('useQuizTimer - Starting timer with startTime:', startTime);
    setTimerState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      questionStartTime: new Date()
    }));
  }, [startTime]);

  // Pause the timer
  const pause = useCallback(() => {
    console.log('useQuizTimer - Pausing timer');
    setTimerState(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  // Resume the timer
  const resume = useCallback(() => {
    console.log('useQuizTimer - Resuming timer');
    setTimerState(prev => ({
      ...prev,
      isPaused: false,
      questionStartTime: new Date()
    }));
  }, []);

  // Stop the timer
  const stop = useCallback(() => {
    console.log('useQuizTimer - Stopping timer');
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false
    }));
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Reset the timer
  const reset = useCallback(() => {
    console.log('useQuizTimer - Resetting timer');
    setTimerState({
      elapsedSeconds: 0,
      isRunning: false,
      isPaused: false,
      questionStartTime: null,
      questionTimes: []
    });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Record time for current question and move to next
  const nextQuestion = useCallback(() => {
    if (!timerState.questionStartTime) {
      console.log('useQuizTimer - nextQuestion: No questionStartTime');
      return;
    }
    
    const questionTime = Math.round((Date.now() - timerState.questionStartTime.getTime()) / 1000);
    console.log('useQuizTimer - Recording question time:', questionTime);
    
    setTimerState(prev => ({
      ...prev,
      questionTimes: [...prev.questionTimes, questionTime],
      questionStartTime: new Date()
    }));
  }, [timerState.questionStartTime]);

  // Update elapsed time every second
  useEffect(() => {
    if (!startTime || !timerState.isRunning || timerState.isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    console.log('useQuizTimer - Setting up interval for timer updates');
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      console.log('useQuizTimer - Updating elapsed time:', elapsed);
      setTimerState(prev => ({
        ...prev,
        elapsedSeconds: elapsed
      }));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startTime, timerState.isRunning, timerState.isPaused]);

  // Auto-start when startTime is provided
  useEffect(() => {
    if (startTime && !timerState.isRunning) {
      console.log('useQuizTimer - Auto-starting timer');
      start();
    }
  }, [startTime, timerState.isRunning, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getCurrentQuestionTime = useCallback(() => {
    if (!timerState.questionStartTime) return 0;
    return Math.floor((Date.now() - timerState.questionStartTime.getTime()) / 1000);
  }, [timerState.questionStartTime]);

  const formattedTime = formatTime(timerState.elapsedSeconds);
  console.log('useQuizTimer - Formatted time:', formattedTime, 'from seconds:', timerState.elapsedSeconds);

  return {
    elapsedSeconds: timerState.elapsedSeconds,
    elapsedTime: timerState.elapsedSeconds, // Add alias for backward compatibility
    formattedTime,
    isRunning: timerState.isRunning,
    isPaused: timerState.isPaused,
    questionTimes: timerState.questionTimes,
    currentQuestionTime: getCurrentQuestionTime(),
    start,
    pause,
    resume,
    stop,
    reset,
    nextQuestion,
    formatTime
  };
}
