import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SpaceshipLoader } from '@/components/ui/SpaceshipLoader';
import { FileText, AlertTriangle } from 'lucide-react';

interface LoadingStateProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoadingState({ isOpen, onClose }: LoadingStateProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Loading PDF...
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <SpaceshipLoader size="md" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ErrorStateProps {
  isOpen: boolean;
  onClose: () => void;
  error: string;
}

export function ErrorState({ isOpen, onClose, error }: ErrorStateProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Loading Error
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
