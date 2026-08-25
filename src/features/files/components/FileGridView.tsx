
import { FileData } from '@/hooks/useFiles';
import { FileItem } from './FileItem';
import { BulkActions } from './BulkActions';

interface FileGridViewProps {
  files: FileData[];
  selectedFiles: string[];
  isSelectionMode: boolean;
  onFileSelect: (fileId: string, selected: boolean) => void;
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

export function FileGridView({
  files,
  selectedFiles,
  isSelectionMode,
  onFileSelect,
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
}: FileGridViewProps) {
  return (
    <div>
      <BulkActions
        selectedCount={selectedFiles.length}
        onBulkTag={onBulkTag}
        onBulkMove={onBulkMove}
        onBulkDelete={onBulkDelete}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            isSelected={selectedFiles.includes(file.id)}
            isSelectionMode={isSelectionMode}
            onSelect={(selected) => onFileSelect(file.id, selected)}
            onPreview={() => onPreview(file)}
            onDownload={() => onDownload(file)}
            onDelete={() => onDelete(file.id)}
            onRename={(newName) => onRename(file.id, newName)}
            onAddTags={() => onAddTags(file.id)}
            onRemoveTag={(tag) => onRemoveTag(file.id, tag)}
          />
        ))}
      </div>
    </div>
  );
}
