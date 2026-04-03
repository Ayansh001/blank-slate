
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AdvancedQuizGenerator } from './AdvancedQuizGenerator';

interface AdvancedQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  source?: {
    type: 'file' | 'note';
    id: string;
    name: string;
  };
}

export function AdvancedQuizDialog({ open, onOpenChange, content, source }: AdvancedQuizDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          <AdvancedQuizGenerator 
            content={content} 
            source={source}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
