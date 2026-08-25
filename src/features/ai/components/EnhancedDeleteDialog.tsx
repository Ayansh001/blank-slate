
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
  Brain, 
  FileText, 
  MessageCircle,
  Calendar,
  Target,
  Info
} from 'lucide-react';
import { safeFormatDate } from '@/utils/dateUtils';

interface EnhancedDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any;
  recordType: 'quiz' | 'enhancement' | 'chat';
  onConfirm: (id: string) => void;
  isDeleting: boolean;
}

export function EnhancedDeleteDialog({
  open,
  onOpenChange,
  record,
  recordType,
  onConfirm,
  isDeleting
}: EnhancedDeleteDialogProps) {
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const getRecordDetails = () => {
    switch (recordType) {
      case 'quiz':
        const questions = record?.questions && typeof record.questions === 'object' 
          ? record.questions.questions || [] 
          : [];
        return {
          icon: <Brain className="h-5 w-5 text-blue-500" />,
          title: `Quiz: ${record?.quiz_type?.replace('_', ' ') || 'Unknown'}`,
          subtitle: `Score: ${record?.score}% • ${questions.length || 0} questions`,
          warningText: 'This will permanently delete the quiz session including all questions, answers, and performance data.',
          details: [
            `Score: ${record?.score}%`,
            `Questions: ${questions.length || 0}`,
            `Time spent: ${record?.time_spent_minutes} minutes`,
            `AI Service: ${record?.ai_service}`
          ]
        };
      case 'enhancement':
        return {
          icon: <FileText className="h-5 w-5 text-green-500" />,
          title: `Enhancement: ${record?.enhancement_type?.replace('_', ' ') || 'Unknown'}`,
          subtitle: `${record?.is_applied ? 'Applied' : 'Not Applied'} • ${record?.ai_service}`,
          warningText: 'This will permanently delete the note enhancement and all associated AI-generated content.',
          details: [
            `Enhancement type: ${record?.enhancement_type?.replace('_', ' ')}`,
            `Status: ${record?.is_applied ? 'Applied' : 'Not Applied'}`,
            `AI Service: ${record?.ai_service}`,
            `Model: ${record?.model_used}`
          ]
        };
      case 'chat':
        return {
          icon: <MessageCircle className="h-5 w-5 text-purple-500" />,
          title: `Chat: ${record?.session_name || 'Untitled Session'}`,
          subtitle: `${record?.total_messages || 0} messages • ${record?.session_type || 'General'}`,
          warningText: 'This will permanently delete the chat session and all associated messages.',
          details: [
            `Messages: ${record?.total_messages || 0}`,
            `Session type: ${record?.session_type || 'General'}`,
            `Created: ${safeFormatDate(record?.created_at, 'MMM d, yyyy')}`,
            `Last updated: ${safeFormatDate(record?.updated_at, 'MMM d, yyyy')}`
          ]
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Unknown Record',
          subtitle: 'Unknown type',
          warningText: 'This will permanently delete the selected record.',
          details: []
        };
    }
  };

  const recordDetails = getRecordDetails();

  const handleConfirm = () => {
    if (confirmationChecked) {
      onConfirm(record.id);
      setConfirmationChecked(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Record
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {recordDetails.icon}
              <div>
                <p className="font-medium">{recordDetails.title}</p>
                <p className="text-sm text-muted-foreground">{recordDetails.subtitle}</p>
              </div>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {recordDetails.warningText}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4" />
                Record Details:
              </div>
              <ul className="space-y-1 ml-6 text-sm text-muted-foreground">
                {recordDetails.details.map((detail, index) => (
                  <li key={index}>• {detail}</li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Data Loss Warning
              </div>
              <p className="text-red-700 text-sm">
                This action cannot be undone. All data associated with this record will be permanently removed from your account.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="confirm-delete" 
                  checked={confirmationChecked}
                  onCheckedChange={(checked) => setConfirmationChecked(checked === true)}
                />
                <label 
                  htmlFor="confirm-delete" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand this action cannot be undone and want to permanently delete this record
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Created: {safeFormatDate(record?.created_at || record?.completed_at, 'MMM d, yyyy HH:mm')}
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
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
