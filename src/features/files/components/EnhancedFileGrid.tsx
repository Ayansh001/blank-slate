
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { File } from 'lucide-react';
import { FileData } from '@/hooks/useFiles';
import { FileGridView } from './FileGridView';
import { FileListView } from './FileListView';
import { TagManager } from './TagManager';
import { FilesBulkDeleteDialog } from './FilesBulkDeleteDialog';
import { FilesBulkMoveDialog } from './FilesBulkMoveDialog';

interface EnhancedFileGridProps {
  files: FileData[];
  viewMode: 'grid' | 'list';
  selectedFiles: string[];
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onPreview: (file: FileData) => void;
  onDownload: (file: FileData) => void;
  onDelete: (fileId: string) => void;
  onRename: (fileId: string, newName: string) => void;
  onAddTags: (fileId: string, tags: string[]) => void;
  onRemoveTag: (fileId: string, tag: string) => void;
  onMoveFiles: (fileIds: string[], folderId: string | null) => void;
  onBulkDeleteFiles: (fileIds: string[]) => void;
  onBulkTagFiles: (fileIds: string[], tags: string[]) => void;
  isDeleting?: boolean;
}

export function EnhancedFileGrid({
  files,
  viewMode,
  selectedFiles,
  onFileSelect,
  onSelectAll,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onAddTags,
  onRemoveTag,
  onMoveFiles,
  onBulkDeleteFiles,
  onBulkTagFiles,
  isDeleting
}: EnhancedFileGridProps) {
  const [taggingFile, setTaggingFile] = useState<string | null>(null);
  const [showBulkTagManager, setShowBulkTagManager] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  // Compute selection mode based on whether any files are selected
  const isSelectionMode = selectedFiles.length > 0;
  const selectedFileObjects = files.filter(file => selectedFiles.includes(file.id));

  const handleAddTags = (fileId: string, tags: string[]) => {
    onAddTags(fileId, tags);
    setTaggingFile(null);
  };

  const handleBulkTag = () => {
    setShowBulkTagManager(true);
  };

  const handleBulkMove = () => {
    setShowBulkMoveDialog(true);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const handleBulkTagConfirm = (tags: string[]) => {
    setIsBulkProcessing(true);
    onBulkTagFiles(selectedFiles, tags);
    setShowBulkTagManager(false);
    setIsBulkProcessing(false);
    // Clear selection after bulk action
    onSelectAll(false);
  };

  const handleBulkMoveConfirm = (folderId: string | null) => {
    setIsBulkProcessing(true);
    onMoveFiles(selectedFiles, folderId);
    setShowBulkMoveDialog(false);
    setIsBulkProcessing(false);
    // Clear selection after bulk action
    onSelectAll(false);
  };

  const handleBulkDeleteConfirm = () => {
    setIsBulkProcessing(true);
    onBulkDeleteFiles(selectedFiles);
    setShowBulkDeleteDialog(false);
    setIsBulkProcessing(false);
    // Clear selection after bulk action
    onSelectAll(false);
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <File className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No files in this location</p>
          <p className="text-sm text-slate-500 mt-2">
            Upload files to get started with OCR and text extraction
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {viewMode === 'list' ? (
        <FileListView
          files={files}
          selectedFiles={selectedFiles}
          isSelectionMode={isSelectionMode}
          onFileSelect={onFileSelect}
          onSelectAll={onSelectAll}
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
          onRename={onRename}
          onAddTags={setTaggingFile}
          onRemoveTag={onRemoveTag}
          onBulkTag={handleBulkTag}
          onBulkMove={handleBulkMove}
          onBulkDelete={handleBulkDelete}
          isDeleting={isDeleting}
        />
      ) : (
        <FileGridView
          files={files}
          selectedFiles={selectedFiles}
          isSelectionMode={isSelectionMode}
          onFileSelect={onFileSelect}
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
          onRename={onRename}
          onAddTags={setTaggingFile}
          onRemoveTag={onRemoveTag}
          onBulkTag={handleBulkTag}
          onBulkMove={handleBulkMove}
          onBulkDelete={handleBulkDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Individual file tagging */}
      <TagManager
        isOpen={!!taggingFile}
        onClose={() => setTaggingFile(null)}
        onAddTags={(tags) => taggingFile && handleAddTags(taggingFile, tags)}
      />

      {/* Bulk tagging */}
      <TagManager
        isOpen={showBulkTagManager}
        onClose={() => setShowBulkTagManager(false)}
        onAddTags={handleBulkTagConfirm}
      />

      {/* Bulk delete dialog */}
      <FilesBulkDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        files={selectedFileObjects}
        onConfirm={handleBulkDeleteConfirm}
        isDeleting={isBulkProcessing || isDeleting}
      />

      {/* Bulk move dialog */}
      <FilesBulkMoveDialog
        open={showBulkMoveDialog}
        onOpenChange={setShowBulkMoveDialog}
        files={selectedFileObjects}
        onConfirm={handleBulkMoveConfirm}
        isMoving={isBulkProcessing}
      />
    </>
  );
}
