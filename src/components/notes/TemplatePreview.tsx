
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NoteTemplate } from '@/types/note';
import { Eye, FileText } from 'lucide-react';

interface TemplatePreviewProps {
  template: NoteTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: NoteTemplate) => void;
}

export function TemplatePreview({ template, isOpen, onClose, onUseTemplate }: TemplatePreviewProps) {
  if (!template) return null;

  const handleUseTemplate = () => {
    onUseTemplate(template);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview: {template.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="h-4 w-4" />
            <span>{template.description}</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {template.category}
            </span>
          </div>
          
          <div className="border rounded-lg p-4 bg-slate-50">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: template.content }}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Close Preview
            </Button>
            <Button onClick={handleUseTemplate}>
              Use This Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
