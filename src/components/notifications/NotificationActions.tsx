
import { Button } from '@/components/ui/button';
import { NotificationAction } from '@/types/notifications';

interface NotificationActionsProps {
  actions: NotificationAction[];
  onAction: (action: string) => void;
}

export function NotificationActions({ actions, onAction }: NotificationActionsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex gap-2 mt-2">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || 'default'}
          size="sm"
          onClick={() => onAction(action.action)}
          className="text-xs"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
