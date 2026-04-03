
import { CheckCircle, Clock, AlertCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteStatusIndicatorProps {
  status: 'saved' | 'saving' | 'draft' | 'error';
  className?: string;
}

export function NoteStatusIndicator({ status, className }: NoteStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: CheckCircle,
          text: 'Saved',
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'saving':
        return {
          icon: Save,
          text: 'Saving...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'draft':
        return {
          icon: Clock,
          text: 'Draft',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error',
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          icon: Clock,
          text: 'Draft',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const { icon: Icon, text, color, bgColor } = getStatusConfig();

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1 rounded-full text-sm',
      color,
      bgColor,
      className
    )}>
      <Icon className="h-4 w-4" />
      <span>{text}</span>
    </div>
  );
}
