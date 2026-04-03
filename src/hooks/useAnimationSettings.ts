import { createContext, useContext } from 'react';

export type AnimationPreference = 'enabled' | 'disabled';

type AnimationSettingsContextType = {
  animationsEnabled: AnimationPreference;
  setAnimationsEnabled: (enabled: AnimationPreference) => void;
  toggleAnimations: () => void;
};

const AnimationSettingsContext = createContext<AnimationSettingsContextType | undefined>(undefined);

export function useAnimationSettings() {
  const context = useContext(AnimationSettingsContext);
  if (context === undefined) {
    throw new Error('useAnimationSettings must be used within an AnimationSettingsProvider');
  }
  return context;
}

export { AnimationSettingsContext };