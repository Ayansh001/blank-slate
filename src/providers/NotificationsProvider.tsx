
import React, { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { user } = useAuth();
  
  // Initialize notifications system - this will register the callback
  const notifications = useNotifications();

  useEffect(() => {
    if (user) {
      console.log('NotificationsProvider: User authenticated, notifications system active for:', user.id);
    }
  }, [user]);

  return <>{children}</>;
}
