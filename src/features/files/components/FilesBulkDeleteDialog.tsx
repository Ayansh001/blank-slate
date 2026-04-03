
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Trash2, File } from 'lucide-react';
import { FileData } from '@/hooks/useFiles';

interface FilesBulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileData[];
  onConfirm: () => void;
  isDeleting: boolean;
}

export function FilesBulkDeleteDialog({
  open,
  onOpenChange,
  files,
  onConfirm,
  isDeleting
}: FilesBulkDeleteDialogProps) {
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const handleConfirm = () => {
    if (confirmationChecked) {
      onConfirm();
      setConfirmationChecked(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setConfirmationChecked(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Files
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will permanently delete all selected files from your storage.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="font-medium">
                You are about to delete {files.length} files:
              </p>
              
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <div className="space-y-2 p-3">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{file.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Warning
              </div>
              <p className="text-destructive/80 text-sm">
                This action cannot be undone. All selected files will be permanently removed from your storage.
              </p>
            </div>

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
                I understand this action cannot be undone and want to permanently delete these {files.length} files
              </label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!confirmationChecked || isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Delete ${files.length} Files`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
