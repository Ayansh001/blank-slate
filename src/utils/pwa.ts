// PWA utilities and service worker management
export class PWAManager {
  private static instance: PWAManager;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private deferredPrompt: any = null;

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('[PWA] Service Worker registered:', this.swRegistration);
        
        // Handle updates
        this.swRegistration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate();
        });

        // Check for updates periodically
        setInterval(() => {
          this.swRegistration?.update();
        }, 60000); // Check every minute

      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    }

    // Handle install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // Handle app installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.hideInstallButton();
      this.deferredPrompt = null;
    });
  }

  private handleServiceWorkerUpdate(): void {
    if (!this.swRegistration) return;

    const newWorker = this.swRegistration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New version available
        this.showUpdateAvailable();
      }
    });
  }

  private showUpdateAvailable(): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  private showInstallButton(): void {
    // Dispatch custom event for UI to show install button
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  }

  private hideInstallButton(): void {
    // Dispatch custom event for UI to hide install button
    window.dispatchEvent(new CustomEvent('pwa-install-completed'));
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        return true;
      } else {
        console.log('[PWA] User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  async updateServiceWorker(): Promise<void> {
    if (!this.swRegistration?.waiting) return;

    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload page after new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  // Push notifications
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      console.error('[PWA] Service Worker not registered');
      return null;
    }

    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
        ) as BufferSource
      });

      console.log('[PWA] Push subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Background sync
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.swRegistration || !('sync' in ServiceWorkerRegistration.prototype)) {
      console.warn('[PWA] Background sync not supported');
      return;
    }

    try {
      await (this.swRegistration as any).sync.register(tag);
      console.log('[PWA] Background sync registered:', tag);
    } catch (error) {
      console.error('[PWA] Background sync registration failed:', error);
    }
  }

  // Network status
  isOnline(): boolean {
    return navigator.onLine;
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // Device capabilities
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  supportsCamera(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  supportsVibration(): boolean {
    return 'vibrate' in navigator;
  }

  supportsShare(): boolean {
    return 'share' in navigator;
  }

  async share(data: ShareData): Promise<boolean> {
    if (!this.supportsShare()) {
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('[PWA] Share failed:', error);
      return false;
    }
  }

  vibrate(pattern: number | number[]): boolean {
    if (!this.supportsVibration()) {
      return false;
    }

    try {
      navigator.vibrate(pattern);
      return true;
    } catch (error) {
      console.error('[PWA] Vibration failed:', error);
      return false;
    }
  }
}