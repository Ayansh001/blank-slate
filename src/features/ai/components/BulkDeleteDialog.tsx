import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Clock,
  Target,
  Trash2
} from 'lucide-react';
import { safeFormatDate } from '@/utils/dateUtils';

interface BulkDeleteItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  metadata?: any;
}

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: BulkDeleteItem[];
  dataType: 'quiz' | 'enhancement' | 'chat';
  onConfirm: () => void;
  isDeleting: boolean;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  items,
  dataType,
  onConfirm,
  isDeleting
}: BulkDeleteDialogProps) {
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const getDataTypeInfo = () => {
    switch (dataType) {
      case 'quiz':
        return {
          name: 'Quiz Sessions',
          warning: 'This will permanently delete all selected quiz sessions including questions, answers, and performance data.'
        };
      case 'enhancement':
        return {
          name: 'Note Enhancements',
          warning: 'This will permanently delete all selected note enhancements and associated AI-generated content.'
        };
      case 'chat':
        return {
          name: 'Chat Sessions',
          warning: 'This will permanently delete all selected chat sessions and all associated messages.'
        };
      default:
        return {
          name: 'Records',
          warning: 'This will permanently delete all selected records.'
        };
    }
  };

  const typeInfo = getDataTypeInfo();

  const handleConfirm = () => {
    if (confirmationChecked) {
      onConfirm();
      setConfirmationChecked(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Bulk Delete {typeInfo.name}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {typeInfo.warning}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="font-medium">
                You are about to delete {items.length} {dataType === 'quiz' ? 'quiz sessions' : dataType === 'enhancement' ? 'enhancements' : 'chat sessions'}:
              </p>
              
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <div className="space-y-2 p-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          {safeFormatDate(item.date, 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Data Loss Warning
              </div>
              <p className="text-red-700 text-sm">
                This action cannot be undone. All selected records and their associated data will be permanently removed from your account.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="confirm-bulk-delete" 
                  checked={confirmationChecked}
                  onCheckedChange={(checked) => setConfirmationChecked(checked === true)}
                />
                <label 
                  htmlFor="confirm-bulk-delete" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand this action cannot be undone and want to permanently delete these {items.length} records
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setConfirmationChecked(false);
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmationChecked || isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Delete ${items.length} Records Permanently`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
