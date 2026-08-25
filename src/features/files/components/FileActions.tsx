
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Download, 
  Trash2, 
  Tag, 
  Eye,
  FileText,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileData } from '@/hooks/useFiles';
import { OCRButton } from '@/features/ocr/components/OCRButton';
import { pdfService } from '@/features/pdf/services/PDFService';

interface FileActionsProps {
  file: FileData;
  onPreview?: (file: FileData) => void;
  onDownload?: (file: FileData) => void;
  onRename?: (newName: string) => void;
  onDelete: (fileId: string) => void;
  onAddTags: () => void; // Changed: just trigger tag management
  isDeleting?: boolean;
}

export function FileActions({
  file,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onAddTags,
  isDeleting = false
}: FileActionsProps) {
  const isOCRSupported = pdfService.isOCRSupported(file.file_type);
  const isPDF = pdfService.isPDFFile(file.file_type);

  return (
    <div className="flex items-center space-x-1">
      {/* Primary OCR button for supported files */}
      {isOCRSupported && (
        <OCRButton file={file} variant="outline" size="sm" />
      )}

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border-border shadow-lg z-50">
          {onPreview && (
            <DropdownMenuItem onClick={() => onPreview(file)} className="h-10">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
          )}
          
          {onDownload && (
            <DropdownMenuItem onClick={() => onDownload(file)} className="h-10">
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
          )}

          {onRename && (
            <DropdownMenuItem onClick={() => onRename(file.name)} className="h-10">
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
          )}

          {isPDF && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="h-10">
                <FileText className="h-4 w-4 mr-2" />
                Convert to Text (Use OCR button)
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={onAddTags} className="h-10">
            <Tag className="h-4 w-4 mr-2" />
            Add Tags
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => onDelete(file.id)}
            disabled={isDeleting}
            className="text-destructive focus:text-destructive h-10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
