import { toast } from 'sonner';
import { 
  NotificationType, 
  NotificationData, 
  NotificationPreferences, 
  DEFAULT_PREFERENCES,
  NOTIFICATION_TEMPLATES 
} from '@/types/notifications';

type NotificationCallback = (type: NotificationType, data: NotificationData) => void;

class NotificationServiceClass {
  private callbacks: NotificationCallback[] = [];
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private initialized = false;
  private historyPatched = false;

  constructor() {
    this.loadPreferences();
    this.initialized = true;
    console.log('NotificationService initialized with preferences:', this.preferences);
  }

  private ensureHistoryPatched() {
    if (this.historyPatched) return;
    
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      window.dispatchEvent(new CustomEvent('locationchange'));
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      window.dispatchEvent(new CustomEvent('locationchange'));
    };
    
    window.addEventListener('popstate', () => {
      window.dispatchEvent(new CustomEvent('locationchange'));
    });
    
    this.historyPatched = true;
  }

  addCallback(callback: NotificationCallback) {
    this.callbacks.push(callback);
    console.log('Added notification callback, total callbacks:', this.callbacks.length);
  }

  removeCallback(callback: NotificationCallback) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
    console.log('Removed notification callback, total callbacks:', this.callbacks.length);
  }

  create(type: NotificationType, data: NotificationData) {
    console.log('Creating notification:', { 
      type, 
      data, 
      preferences: this.preferences,
      callbackCount: this.callbacks.length,
      initialized: this.initialized
    });
    
    if (!this.preferences[type]) {
      console.log(`Notification type ${type} is disabled in preferences`);
      return;
    }

    const template = NOTIFICATION_TEMPLATES[type] || {};
    const mergedData = { ...template, ...data };

    console.log('Merged notification data:', mergedData);

    this.showToast(type, mergedData);

    console.log('Notifying callbacks for database persistence:', this.callbacks.length);
    
    if (this.callbacks.length === 0) {
      console.warn('No notification callbacks registered - notifications will not be persisted to database');
    }

    this.callbacks.forEach((callback, index) => {
      try {
        console.log(`Calling notification callback ${index + 1}/${this.callbacks.length}`);
        callback(type, mergedData);
      } catch (error) {
        console.error(`Notification callback ${index + 1} error:`, error);
      }
    });
  }

  private showToast(type: NotificationType, data: NotificationData) {
    // Suppress UI toasts for enhancement_ready and quiz_completed to avoid duplication
    // These are already handled by component-level toasts in the Learn page
    if (type === 'enhancement_ready' || type === 'quiz_completed') {
      console.log(`Suppressing UI toast for ${type} to avoid duplication with component toasts`);
      return;
    }

    const isOnFilesPage = window.location.hash.includes('/files') || window.location.pathname === '/files';
    
    const toastOptions: any = {
      description: data.message,
      duration: data.autoClose === false ? 
        (type === 'ocr_completion' && isOnFilesPage ? Infinity : 5000) : 
        (data.duration || 5000)
    };

    if (data.actions && data.actions.length > 0) {
      const primaryAction = data.actions[0];
      toastOptions.action = {
        label: primaryAction.label,
        onClick: () => this.handleAction(primaryAction.action, data.data)
      };
    }

    let toastId: string | number;

    switch (data.priority) {
      case 'urgent':
        toastId = toast.error(data.title, toastOptions);
        break;
      case 'high':
        toastId = toast.warning(data.title, toastOptions);
        break;
      case 'low':
        toastId = toast.message(data.title, toastOptions);
        break;
      default:
        toastId = toast.success(data.title, toastOptions);
    }

    // Special handling for OCR completion toasts on files page
    if (type === 'ocr_completion' && isOnFilesPage && toastOptions.duration === Infinity) {
      this.ensureHistoryPatched();
      
      const dismissToast = () => {
        toast.dismiss(toastId);
        cleanup();
      };
      
      const handleLocationChange = () => {
        const stillOnFilesPage = window.location.hash.includes('/files') || window.location.pathname === '/files';
        if (!stillOnFilesPage) {
          dismissToast();
        }
      };
      
      const handleDocumentClick = (e: Event) => {
        const target = e.target as Element;
        const toastElement = target.closest('[data-sonner-toast]');
        if (!toastElement) {
          dismissToast();
        }
      };
      
      const cleanup = () => {
        window.removeEventListener('locationchange', handleLocationChange);
        document.removeEventListener('click', handleDocumentClick, true);
        document.removeEventListener('touchstart', handleDocumentClick, true);
      };
      
      window.addEventListener('locationchange', handleLocationChange);
      document.addEventListener('click', handleDocumentClick, true);
      document.addEventListener('touchstart', handleDocumentClick, true);
    }
    
    console.log('Toast notification shown:', { type, title: data.title, priority: data.priority });
  }

  private handleAction(action: string, data?: any) {
    switch (action) {
      case 'view_result':
        window.dispatchEvent(new CustomEvent('notification-action', { 
          detail: { action, data } 
        }));
        break;
      case 'save_to_notes':
        window.dispatchEvent(new CustomEvent('notification-action', { 
          detail: { action, data } 
        }));
        break;
      case 'view_results':
        window.dispatchEvent(new CustomEvent('notification-action', { 
          detail: { action, data } 
        }));
        break;
      case 'update_key':
        window.location.hash = '#/settings?tab=ai';
        break;
      case 'open_settings':
        window.location.hash = '#/settings';
        break;
      case 'dismiss':
        break;
      default:
        console.log('Unknown notification action:', action);
    }
  }

  setPreferences(preferences: NotificationPreferences) {
    this.preferences = preferences;
    this.savePreferences();
    console.log('Updated notification preferences:', this.preferences);
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  private loadPreferences() {
    try {
      const saved = localStorage.getItem('notification_preferences');
      if (saved) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
      console.log('Loaded notification preferences:', this.preferences);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  private savePreferences() {
    try {
      localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  fileUploaded(fileName: string, fileSize?: number) {
    console.log('Triggering file upload notification:', { fileName, fileSize, initialized: this.initialized });
    this.create('file_upload', {
      title: 'File Uploaded',
      message: `${fileName} has been uploaded successfully${fileSize ? ` (${Math.round(fileSize / 1024)} KB)` : ''}`,
      data: { fileName, fileSize }
    });
  }

  ocrCompleted(fileName: string, textLength: number, fileId?: string) {
    console.log('Triggering OCR completion notification:', fileName);
    this.create('ocr_completion', {
      title: 'OCR Processing Complete',
      message: `Text extraction completed for ${fileName}. ${textLength} characters extracted.`,
      data: { fileName, textLength, fileId }
    });
  }

  quizCompleted(quizName: string, score?: number) {
    console.log('Triggering quiz completion notification:', quizName);
    this.create('quiz_completed', {
      title: 'Quiz Completed',
      message: `You've completed ${quizName}${score !== undefined ? ` with a score of ${score}%` : ''}`,
      data: { quizName, score }
    });
  }

  studyMilestone(milestone: string, details: string) {
    console.log('Triggering study milestone notification:', milestone);
    this.create('study_milestone', {
      title: 'Study Milestone Achieved!',
      message: `${milestone}: ${details}`,
      data: { milestone, details }
    });
  }

  apiQuotaWarning(service: string, usage: number) {
    console.log('Triggering API quota warning:', service);
    this.create('api_quota', {
      title: 'API Quota Warning',
      message: `${service} API usage is at ${usage}%. Consider updating your API key.`,
      data: { service, usage }
    });
  }

  systemAlert(message: string, severity: 'info' | 'warning' | 'error' = 'info') {
    console.log('Triggering system alert:', { message, severity });
    this.create('system_alert', {
      title: 'System Alert',
      message,
      priority: severity === 'error' ? 'urgent' : severity === 'warning' ? 'high' : 'normal',
      data: { severity }
    });
  }
}

export const NotificationService = new NotificationServiceClass();
