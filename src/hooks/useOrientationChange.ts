import { useState, useEffect } from 'react';

interface OrientationState {
  orientation: 'portrait' | 'landscape';
  angle: number;
  isChanging: boolean;
}

export function useOrientationChange() {
  const [orientationState, setOrientationState] = useState<OrientationState>(() => ({
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
    angle: (screen.orientation?.angle || 0),
    isChanging: false
  }));

  useEffect(() => {
    let changeTimeout: NodeJS.Timeout;

    const handleOrientationChange = () => {
      // Mark as changing
      setOrientationState(prev => ({ ...prev, isChanging: true }));

      // Clear any existing timeout
      if (changeTimeout) {
        clearTimeout(changeTimeout);
      }

      // Delay to allow the browser to complete the orientation change
      changeTimeout = setTimeout(() => {
        const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
        const newAngle = screen.orientation?.angle || 0;

        setOrientationState({
          orientation: newOrientation,
          angle: newAngle,
          isChanging: false
        });

        // Force a layout recalculation
        window.dispatchEvent(new Event('resize'));
      }, 150);
    };

    const handleResize = () => {
      // Only update if not currently changing orientation
      if (!orientationState.isChanging) {
        const newOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
        if (newOrientation !== orientationState.orientation) {
          handleOrientationChange();
        }
      }
    };

    // Listen for orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    // Fallback for older browsers
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    return () => {
      if (changeTimeout) {
        clearTimeout(changeTimeout);
      }

      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }

      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [orientationState.isChanging, orientationState.orientation]);

  return orientationState;
}