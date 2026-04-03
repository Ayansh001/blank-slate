
import { useCallback } from 'react';
import { NotificationService } from '@/services/NotificationService';

interface EnhancementNotificationData {
  type: 'note_enhancement' | 'file_analysis' | 'content_generation' | 'quiz_generation';
  itemName: string;
  enhancementType: string;
  itemId?: string;
  duration?: number;
}

export function useAIEnhancementNotifications() {
  const notifyEnhancementStarted = useCallback((data: EnhancementNotificationData) => {
    NotificationService.create('system_alert', {
      title: 'AI Enhancement Started',
      message: `Starting ${data.enhancementType} for "${data.itemName}"...`,
      priority: 'low',
      data: {
        enhancementType: data.enhancementType,
        itemId: data.itemId,
        itemName: data.itemName,
        status: 'started'
      }
    });
  }, []);

  const notifyEnhancementComplete = useCallback((data: EnhancementNotificationData) => {
    const messages = {
      note_enhancement: `Your note "${data.itemName}" has been enhanced with ${data.enhancementType}`,
      file_analysis: `Analysis complete for "${data.itemName}" using ${data.enhancementType}`,
      content_generation: `${data.enhancementType} generated successfully for "${data.itemName}"`,
      quiz_generation: `Quiz generated from "${data.itemName}" using ${data.enhancementType}`
    };

    const titles = {
      note_enhancement: 'Note Enhancement Complete',
      file_analysis: 'File Analysis Complete', 
      content_generation: 'Content Generation Complete',
      quiz_generation: 'Quiz Generation Complete'
    };

    NotificationService.create('enhancement_ready', {
      title: titles[data.type],
      message: messages[data.type],
      data: {
        enhancementType: data.enhancementType,
        itemId: data.itemId,
        itemName: data.itemName,
        duration: data.duration,
        action: 'view_result'
      }
    });
  }, []);

  const notifyEnhancementError = useCallback((data: EnhancementNotificationData & { error: string }) => {
    NotificationService.create('system_alert', {
      title: 'Enhancement Failed',
      message: `Failed to enhance "${data.itemName}": ${data.error}`,
      priority: 'urgent',
      data: {
        enhancementType: data.enhancementType,
        itemId: data.itemId,
        error: data.error,
        severity: 'error'
      }
    });
  }, []);

  const notifyAPIQuotaWarning = useCallback((serviceName: string, usage: number) => {
    NotificationService.apiQuotaWarning(serviceName, usage);
  }, []);

  return {
    notifyEnhancementStarted,
    notifyEnhancementComplete,
    notifyEnhancementError,
    notifyAPIQuotaWarning
  };
}
