
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPreferences, NotificationType } from '@/types/notifications';
import { toast } from 'sonner';

const NOTIFICATION_CATEGORIES = [
  {
    type: 'file_upload' as NotificationType,
    label: 'File Uploads',
    description: 'Notifications when files are uploaded successfully'
  },
  {
    type: 'ocr_completion' as NotificationType,
    label: 'OCR Processing',
    description: 'Notifications when OCR text extraction completes'
  },
  {
    type: 'quiz_completed' as NotificationType,
    label: 'Quiz Completion',
    description: 'Notifications when quizzes are completed or auto-saved'
  },
  {
    type: 'enhancement_ready' as NotificationType,
    label: 'AI Enhancements',
    description: 'Notifications when AI content enhancements are ready'
  },
  {
    type: 'study_milestone' as NotificationType,
    label: 'Study Milestones',
    description: 'Notifications for study session achievements and streaks'
  },
  {
    type: 'api_quota' as NotificationType,
    label: 'API Quotas',
    description: 'Notifications about API usage limits and quota warnings'
  },
  {
    type: 'system_alert' as NotificationType,
    label: 'System Alerts',
    description: 'Important system notifications and maintenance alerts'
  }
];

export function NotificationSettings() {
  const { 
    notifications, 
    preferences, 
    updatePreferences, 
    clearAllNotifications,
    unreadCount 
  } = useNotifications();
  
  const [isClearing, setIsClearing] = useState(false);

  const handlePreferenceChange = (type: NotificationType, enabled: boolean) => {
    updatePreferences({
      ...preferences,
      [type]: enabled
    });
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllNotifications();
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Customize which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_CATEGORIES.map((category) => (
            <div key={category.type} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={category.type} className="text-sm font-medium">
                  {category.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {category.description}
                </p>
              </div>
              <Switch
                id={category.type}
                checked={preferences[category.type] ?? true}
                onCheckedChange={(enabled) => handlePreferenceChange(category.type, enabled)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Notification Management</CardTitle>
          </div>
          <CardDescription>
            Manage your existing notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Active Notifications</Label>
              <p className="text-xs text-muted-foreground">
                You have {notifications.length} total notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} unread
                  </Badge>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={isClearing || notifications.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isClearing ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
