
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderTree } from './FolderTree';
import { FileData } from '@/hooks/useFiles';
import { FolderOpen } from 'lucide-react';

interface FilesBulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileData[];
  onConfirm: (folderId: string | null) => void;
  isMoving: boolean;
}

export function FilesBulkMoveDialog({
  open,
  onOpenChange,
  files,
  onConfirm,
  isMoving
}: FilesBulkMoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const handleConfirm = () => {
    onConfirm(selectedFolderId);
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedFolderId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Move Files
          </DialogTitle>
          <DialogDescription>
            Select a destination folder for {files.length} files
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto border rounded-lg p-2">
            <FolderTree
              currentFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            {selectedFolderId ? 'Moving to selected folder' : 'Moving to root folder'}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isMoving}
          >
            {isMoving ? 'Moving...' : `Move ${files.length} Files`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
