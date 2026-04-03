
import { useEffect, useCallback } from 'react';

interface NavigationGuardOptions {
  hasUnsavedChanges: boolean;
  onConfirmSave: () => void;
  onDiscard: () => void;
}

export function useNavigationGuard({
  hasUnsavedChanges,
  onConfirmSave,
  onDiscard
}: NavigationGuardOptions) {
  // Handle browser navigation (refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle programmatic navigation (Back to Notes button)
  const guardNavigation = useCallback((callback: () => void) => {
    if (hasUnsavedChanges) {
      const userChoice = window.confirm(
        'You have unsaved changes. Would you like to save before leaving?\n\n' +
        'Click "OK" to save and continue, or "Cancel" to discard changes.'
      );
      
      if (userChoice) {
        onConfirmSave();
        // Give a small delay for save to complete
        setTimeout(callback, 100);
      } else {
        onDiscard();
        callback();
      }
    } else {
      callback();
    }
  }, [hasUnsavedChanges, onConfirmSave, onDiscard]);

  return { guardNavigation };
}
