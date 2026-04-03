import { createContext, useContext, useEffect, useState } from 'react';

export type CompactMode = 'normal' | 'compact';

type CompactModeContextType = {
  compactMode: CompactMode;
  setCompactMode: (mode: CompactMode) => void;
  toggleCompactMode: () => void;
};

const CompactModeContext = createContext<CompactModeContextType | undefined>(undefined);

export function useCompactMode() {
  const context = useContext(CompactModeContext);
  if (context === undefined) {
    throw new Error('useCompactMode must be used within a CompactModeProvider');
  }
  return context;
}

export { CompactModeContext };