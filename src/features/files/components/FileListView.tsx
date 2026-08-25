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
import { BulkActions } from './BulkActions';

interface FileListViewProps {
  files: FileData[];
  selectedFiles: string[];
  isSelectionMode: boolean;
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onPreview: (file: FileData) => void;
  onDownload: (file: FileData) => void;
  onDelete: (fileId: string) => void;
  onRename: (fileId: string, newName: string) => void;
  onAddTags: (fileId: string) => void;
  onRemoveTag: (fileId: string, tag: string) => void;
  onBulkTag: () => void;
  onBulkMove: () => void;
  onBulkDelete: () => void;
  isDeleting?: boolean;
}

export function FileListView({
  files,
  selectedFiles,
  isSelectionMode,
  onFileSelect,
  onSelectAll,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onAddTags,
  onRemoveTag,
  onBulkTag,
  onBulkMove,
  onBulkDelete,
  isDeleting
}: FileListViewProps) {
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType === 'application/pdf') return FileText;
    if (fileType.startsWith('text/')) return FileText;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.startsWith('video/')) return Video;
    return File;
  };

  const allSelected = files.length > 0 && selectedFiles.length === files.length;

  const handleRowClick = (file: FileData) => {
    const isSelected = selectedFiles.includes(file.id);
    if (isSelectionMode) {
      onFileSelect(file.id, !isSelected);
    } else {
      onPreview(file);
    }
  };

  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div>
      <BulkActions
        selectedCount={selectedFiles.length}
        onBulkTag={onBulkTag}
        onBulkMove={onBulkMove}
        onBulkDelete={onBulkDelete}
      />

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(!!checked)}
              />
              <span className="text-sm font-medium">
                {selectedFiles.length > 0 ? `${selectedFiles.length} selected` : 'Select all'}
              </span>
            </div>
          </div>
          
          <div className="divide-y">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.file_type);
              const isSelected = selectedFiles.includes(file.id);
              const isImage = file.file_type.startsWith('image/');

              return (
                <div 
                  key={file.id} 
                  className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 group min-h-[60px] cursor-pointer ${
                    isSelectionMode ? 'select-none' : ''
                  }`}
                  onClick={() => handleRowClick(file)}
                >
                  <div onClick={handleInteractiveClick} className="pointer-events-auto">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onFileSelect(file.id, !!checked)}
                      className="flex-shrink-0"
                    />
                  </div>
                  
                  <div className={`flex items-center gap-2 sm:gap-3 flex-1 min-w-0 ${
                    isSelectionMode ? 'pointer-events-none' : ''
                  }`}>
                    <FileIcon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm sm:text-base">{file.name}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span className="hidden sm:inline">{new Date(file.uploaded_at).toLocaleDateString()}</span>
                        <span className="capitalize hidden md:inline">{file.category}</span>
                      </div>
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap" onClick={handleInteractiveClick}>
                          {file.tags.map((tag, index) => (
                            <TagBadge
                              key={index}
                              tag={tag}
                              onRemove={(tagToRemove) => onRemoveTag(file.id, tagToRemove)}
                              size="sm"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 pointer-events-auto" onClick={handleInteractiveClick}>
                    <FileActions
                      file={file}
                      onPreview={onPreview}
                      onDownload={onDownload}
                      onRename={(newName) => onRename(file.id, newName)}
                      onAddTags={() => onAddTags(file.id)}
                      onDelete={onDelete}
                      isDeleting={isDeleting}
                    />

                    {isImage && (
                      <div className="ml-1">
                        <OCRButton file={file} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
