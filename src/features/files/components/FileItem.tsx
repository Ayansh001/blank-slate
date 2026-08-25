
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Image, 
  File, 
  Music, 
  Video
} from 'lucide-react';
import { FileData } from '@/hooks/useFiles';
import { formatFileSize } from '../utils/fileUtils';
import { FileActions } from './FileActions';
import { OCRButton } from '@/features/ocr/components/OCRButton';
import { TagBadge } from './TagBadge';

interface FileItemProps {
  file: FileData;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onAddTags: () => void;
  onRemoveTag: (tag: string) => void;
}

export function FileItem({
  file,
  isSelected,
  isSelectionMode,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onAddTags,
  onRemoveTag
}: FileItemProps) {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType === 'application/pdf') return FileText;
    if (fileType.startsWith('text/')) return FileText;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.startsWith('video/')) return Video;
    return File;
  };

  const FileIcon = getFileIcon(file.file_type);
  const isImage = file.file_type.startsWith('image/');

  const handleCardClick = () => {
    if (isSelectionMode) {
      onSelect(!isSelected);
    } else {
      onPreview();
    }
  };

  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      className={`group hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${isSelectionMode ? 'select-none' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-3">
          <div onClick={handleInteractiveClick} className="pointer-events-auto">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(!!checked)}
              className="mt-1"
            />
          </div>
          <div onClick={handleInteractiveClick} className="pointer-events-auto">
            <FileActions
              file={file}
              onPreview={onPreview}
              onDownload={onDownload}
              onRename={onRename}
              onAddTags={onAddTags}
              onDelete={onDelete}
            />
          </div>
        </div>

        <div className={`text-center mb-3 ${isSelectionMode ? 'pointer-events-none' : ''}`}>
          {file.thumbnail_url ? (
            <img 
              src={file.thumbnail_url} 
              alt={file.name}
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto object-cover rounded"
            />
          ) : (
            <FileIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground" />
          )}
        </div>

        <div className={`space-y-2 ${isSelectionMode ? 'pointer-events-none' : ''}`}>
          <h4 className="font-medium text-sm truncate" title={file.name}>
            {file.name}
          </h4>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <div>{formatFileSize(file.file_size)}</div>
            <div className="hidden sm:block">{new Date(file.uploaded_at).toLocaleDateString()}</div>
          </div>

          {file.tags && file.tags.length > 0 && (
            <div className="flex flex-wrap gap-1" onClick={handleInteractiveClick}>
              {file.tags.map((tag) => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  onRemove={onRemoveTag}
                  size="sm"
                />
              ))}
            </div>
          )}

          {/* OCR Integration - Only show for images */}
          {isImage && (
            <div className="pt-2 border-t" onClick={handleInteractiveClick}>
              <OCRButton file={file} size="sm" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
