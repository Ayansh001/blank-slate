import { useEffect, useState } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { CompactModeContext, type CompactMode } from '@/hooks/useCompactMode';
import { AnimationSettingsContext, type AnimationPreference } from '@/hooks/useAnimationSettings';

type AppearanceProviderProps = {
  children: React.ReactNode;
};

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  // Compact Mode State
  const [compactMode, setCompactModeState] = useState<CompactMode>(() => {
    const stored = localStorage.getItem('studyvault-compact-mode');
    return (stored as CompactMode) || 'normal';
  });

  // Animation Settings State  
  const [animationsEnabled, setAnimationsEnabledState] = useState<AnimationPreference>(() => {
    const stored = localStorage.getItem('studyvault-animations');
    return (stored as AnimationPreference) || 'enabled';
  });

  // Compact Mode Effects
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (compactMode === 'compact') {
      root.classList.add('compact');
    } else {
      root.classList.remove('compact');
    }
  }, [compactMode]);

  // Animation Settings Effects
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (animationsEnabled === 'disabled') {
      root.classList.add('animations-disabled');
    } else {
      root.classList.remove('animations-disabled');
    }
  }, [animationsEnabled]);

  // Compact Mode Functions
  const setCompactMode = (mode: CompactMode) => {
    localStorage.setItem('studyvault-compact-mode', mode);
    setCompactModeState(mode);
  };

  const toggleCompactMode = () => {
    const newMode = compactMode === 'normal' ? 'compact' : 'normal';
    setCompactMode(newMode);
  };

  // Animation Settings Functions
  const setAnimationsEnabled = (enabled: AnimationPreference) => {
    localStorage.setItem('studyvault-animations', enabled);
    setAnimationsEnabledState(enabled);
  };

  const toggleAnimations = () => {
    const newSetting = animationsEnabled === 'enabled' ? 'disabled' : 'enabled';
    setAnimationsEnabled(newSetting);
  };

  const compactModeValue = {
    compactMode,
    setCompactMode,
    toggleCompactMode,
  };

  const animationSettingsValue = {
    animationsEnabled,
    setAnimationsEnabled,
    toggleAnimations,
  };

  return (
    <ThemeProvider>
      <CompactModeContext.Provider value={compactModeValue}>
        <AnimationSettingsContext.Provider value={animationSettingsValue}>
          {children}
        </AnimationSettingsContext.Provider>
      </CompactModeContext.Provider>
    </ThemeProvider>
  );
}