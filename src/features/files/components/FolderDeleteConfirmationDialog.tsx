
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderData } from '../hooks/useFolders';
import { FolderContents } from '../services/FolderDeletionService';
import { Loader2 } from 'lucide-react';

interface FolderDeleteConfirmationDialogProps {
  folder: FolderData | null;
  contents: FolderContents | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  isLoadingContents: boolean;
}

export function FolderDeleteConfirmationDialog({
  folder,
  contents,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  isLoadingContents
}: FolderDeleteConfirmationDialogProps) {
  if (!folder) return null;

  const isEmpty = contents && contents.totalFiles === 0 && contents.totalSubfolders === 0;
  
  const getDescription = () => {
    if (isLoadingContents) {
      return "Checking folder contents...";
    }

    if (isEmpty) {
      return `Are you sure you want to delete the folder "${folder.name}"?`;
    }

    const fileText = contents!.totalFiles === 1 ? 'file' : 'files';
    const folderText = contents!.totalSubfolders === 1 ? 'subfolder' : 'subfolders';
    
    let description = `The folder "${folder.name}" contains `;
    
    if (contents!.totalFiles > 0 && contents!.totalSubfolders > 0) {
      description += `${contents!.totalFiles} ${fileText} and ${contents!.totalSubfolders} ${folderText}.`;
    } else if (contents!.totalFiles > 0) {
      description += `${contents!.totalFiles} ${fileText}.`;
    } else {
      description += `${contents!.totalSubfolders} ${folderText}.`;
    }
    
    description += " All contents will be permanently deleted. This action cannot be undone.";
    
    return description;
  };

  const getTitle = () => {
    if (isEmpty) {
      return "Delete Folder";
    }
    return "Delete Folder and All Contents";
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription>
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting || isLoadingContents}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting || isLoadingContents}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
