
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  updateAvailable: boolean;
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    updateAvailable: false
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if running as PWA
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;
    
    setPwaState(prev => ({ ...prev, isInstalled }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaState(prev => ({ ...prev, canInstall: true }));
    };

    // Listen for service worker updates with proper error handling
    const handleServiceWorkerUpdate = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          if (registration && registration.waiting) {
            setPwaState(prev => ({ ...prev, updateAvailable: true }));
          }
        }).catch(error => {
          console.warn('Service worker ready check failed:', error);
        });

        // Listen for new service worker installations
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        // Handle service worker updates with null checks
        const handleUpdateFound = () => {
          navigator.serviceWorker.ready.then(registration => {
            if (!registration || !registration.installing) return;
            
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setPwaState(prev => ({ ...prev, updateAvailable: true }));
                toast.info('App update available! Refresh to get the latest version.');
              }
            });
          }).catch(error => {
            console.warn('Service worker update check failed:', error);
          });
        };

        navigator.serviceWorker.addEventListener('updatefound', handleUpdateFound);

        return () => {
          navigator.serviceWorker.removeEventListener('updatefound', handleUpdateFound);
        };
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    handleServiceWorkerUpdate();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return false;

    try {
      const result = await deferredPrompt.prompt();
      setDeferredPrompt(null);
      setPwaState(prev => ({ ...prev, canInstall: false }));
      
      if (result.outcome === 'accepted') {
        toast.success('App installed successfully!');
        return true;
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
      toast.error('Failed to install app');
    }
    
    return false;
  };

  const updatePWA = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }).catch(error => {
        console.warn('Service worker update failed:', error);
      });
    }
  };

  return {
    ...pwaState,
    installPWA,
    updatePWA
  };
}
