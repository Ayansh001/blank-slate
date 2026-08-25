
export type NotificationType = 
  | 'file_upload' 
  | 'ocr_completion' 
  | 'quiz_completed' 
  | 'enhancement_ready' 
  | 'study_milestone' 
  | 'api_quota' 
  | 'system_alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
  label: string;
  action: string;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface NotificationData {
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  actions?: NotificationAction[];
  autoClose?: boolean;
  duration?: number;
}

export interface NotificationPreferences {
  file_upload: boolean;
  ocr_completion: boolean;
  quiz_completed: boolean;
  enhancement_ready: boolean;
  study_milestone: boolean;
  api_quota: boolean;
  system_alert: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  file_upload: true,
  ocr_completion: true,
  quiz_completed: true,
  enhancement_ready: true,
  study_milestone: true,
  api_quota: true,
  system_alert: true
};

export const NOTIFICATION_TEMPLATES: Record<NotificationType, Partial<NotificationData>> = {
  file_upload: {
    priority: 'normal',
    autoClose: true,
    duration: 5000
  },
  ocr_completion: {
    priority: 'normal',
    autoClose: false,
    actions: [
      { label: 'View Text', action: 'view_result' },
      { label: 'Save to Notes', action: 'save_to_notes' }
    ]
  },
  quiz_completed: {
    priority: 'normal',
    autoClose: false,
    actions: [
      { label: 'View Results', action: 'view_results' }
    ]
  },
  enhancement_ready: {
    priority: 'normal',
    autoClose: false,
    actions: [
      { label: 'View Enhancement', action: 'view_result' }
    ]
  },
  study_milestone: {
    priority: 'normal',
    autoClose: true,
    duration: 8000
  },
  api_quota: {
    priority: 'high',
    autoClose: false,
    actions: [
      { label: 'Update API Key', action: 'update_key' },
      { label: 'Settings', action: 'open_settings' }
    ]
  },
  system_alert: {
    priority: 'urgent',
    autoClose: false,
    actions: [
      { label: 'Acknowledge', action: 'dismiss' }
    ]
  }
};
