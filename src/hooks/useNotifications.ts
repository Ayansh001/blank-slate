import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationService } from '@/services/NotificationService';
import { NotificationPreferences } from '@/types/notifications';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    NotificationService.getPreferences()
  );

  // Create notification mutation for manual creation
  const createNotification = useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at' | 'is_read'>) => {
      if (!user) {
        console.error('Cannot create notification: User not authenticated');
        throw new Error('User not authenticated');
      }
      
      console.log('Creating notification in database:', {
        user_id: user.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data
      });

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {}
        })
        .select()
        .single();
      
      if (error) {
        console.error('Database error creating notification:', error);
        throw error;
      }
      
      console.log('Successfully created notification:', data);
      return data;
    },
    onSuccess: () => {
      console.log('Notification created, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (error) => {
      console.error('Failed to create notification:', error);
    }
  });

  // Register callback for database persistence with improved error handling
  useEffect(() => {
    const callback = async (type: string, data: any) => {
      console.log('Notification callback triggered:', { type, data, userExists: !!user });
      
      if (!user) {
        console.log('No user found, skipping database notification');
        return;
      }
      
      try {
        await createNotification.mutateAsync({
          type,
          title: data.title,
          message: data.message,
          data: data.data || {}
        });
      } catch (error) {
        console.error('Failed to persist notification via callback:', error);
      }
    };

    console.log('Registering notification callback for user:', user?.id);
    NotificationService.addCallback(callback);
    
    return () => {
      console.log('Unregistering notification callback');
      NotificationService.removeCallback(callback);
    };
  }, [user, createNotification.mutateAsync]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('No user for notifications query');
        return [];
      }
      
      console.log('Fetching notifications for user:', user.id);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
      
      console.log('Fetched notifications:', data?.length || 0);
      return data as Notification[];
    },
    enabled: !!user
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('Marking notification as read:', notificationId);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('Deleting notification:', notificationId);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('Marking all notifications as read for user:', user.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const clearAllNotifications = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      console.log('Clearing all notifications for user:', user.id);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    }
  });

  const updatePreferences = (newPreferences: NotificationPreferences) => {
    console.log('Updating notification preferences:', newPreferences);
    setPreferences(newPreferences);
    NotificationService.setPreferences(newPreferences);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const addRateLimitNotification = async (serviceName: string) => {
    await createNotification.mutateAsync({
      type: 'rate_limit',
      title: 'Rate Limit Exceeded',
      message: `Your ${serviceName.toUpperCase()} API quota has been exceeded. Please update your API key in Settings > AI Services.`,
      data: { service: serviceName }
    });
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    preferences,
    markAsRead: markAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
    markAllAsRead: markAllAsRead.mutate,
    clearAllNotifications: clearAllNotifications.mutate,
    updatePreferences,
    addRateLimitNotification,
    createNotification: createNotification.mutateAsync
  };
}
