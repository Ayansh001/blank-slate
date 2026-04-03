import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { useFiles } from '@/hooks/useFiles';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { FilePreview } from '@/components/files/FilePreview';
import { FileData } from '@/hooks/useFiles';
import { EnhancedFileGrid } from '@/features/files/components/EnhancedFileGrid';
import { MultiModalAnalysisPanel } from '@/features/ai/components/MultiModalAnalysisPanel';
import { FileHeader } from '@/features/files/components/FileHeader';
import { FileFilters } from '@/features/files/components/FileFilters';
import { FileSearch } from '@/features/files/components/FileSearch';
import { SmartOrganizerPanel } from '@/features/smart-organization/components/SmartOrganizerPanel';
import { SimpleFileEnhancer } from '@/components/ai/SimpleFileEnhancer';
import { RenameDialog } from '@/components/dialogs/RenameDialog';
import { EnhancedFileUploadZone } from '@/features/files/components/EnhancedFileUploadZone';
import { useEnhancedFiles } from '@/features/files/hooks/useEnhancedFiles';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

export default function Files() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use enhanced files hook for better upload experience
  const enhancedFiles = useEnhancedFiles(currentFolderId);
  
  // Fallback to original hook if enhanced one is not available
  const originalFiles = useFiles(currentFolderId);
  
  // Use enhanced files if available, otherwise fallback to original
  const filesHook = enhancedFiles || originalFiles;
  const { files, uploadFiles, deleteFile, addTags, removeTag, moveFiles, updateFile, isUploading, isDeleting } = filesHook;
  
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>([]);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showSmartOrganizer, setShowSmartOrganizer] = useState(false);
  const [showMultiModalAnalysis, setShowMultiModalAnalysis] = useState(false);
  const [showFileEnhancer, setShowFileEnhancer] = useState(false);
  const [fileToEnhance, setFileToEnhance] = useState<FileData | null>(null);
  const [useEnhancedUpload, setUseEnhancedUpload] = useState(true);
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    fileId: string;
    currentName: string;
  }>({
    isOpen: false,
    fileId: '',
    currentName: ''
  });

  // Filter files based on search, category, and tags
  useEffect(() => {
    let filtered = files;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => file.category === selectedCategory);
    }

    // Tags filter - Remove any selected tags that no longer exist in any files
    const availableTags = Array.from(new Set(files.flatMap(f => f.tags || []))).filter(Boolean);
    const validSelectedTags = selectedTags.filter(tag => availableTags.includes(tag));
    
    // Update selectedTags if some tags are no longer available
    if (validSelectedTags.length !== selectedTags.length) {
      console.log('Files: Cleaning up invalid selected tags');
      setSelectedTags(validSelectedTags);
    }

    if (validSelectedTags.length > 0) {
      filtered = filtered.filter(file => 
        file.tags && validSelectedTags.every(tag => file.tags!.includes(tag))
      );
    }

    setFilteredFiles(filtered);
  }, [files, searchQuery, selectedCategory, selectedTags]);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    try {
      await uploadFiles(selectedFiles, currentFolderId || undefined);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    }
  };

  const handleFileSelect = (fileId: string, selected: boolean) => {
    setSelectedFiles(prev => 
      selected 
        ? [...prev, fileId]
        : prev.filter(id => id !== fileId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedFiles(selected ? filteredFiles.map(f => f.id) : []);
  };

  const handlePreview = (file: FileData) => {
    setPreviewFile(file);
  };

  const handleDownload = (file: FileData) => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteFile(fileId);
    }
  };

  const handleRename = (fileId: string, currentName: string) => {
    setRenameDialog({
      isOpen: true,
      fileId,
      currentName
    });
  };

  const handleRenameSubmit = async (newName: string) => {
    try {
      await updateFile({ fileId: renameDialog.fileId, updates: { name: newName } });
      toast.success('File renamed successfully');
      setRenameDialog({ isOpen: false, fileId: '', currentName: '' });
    } catch (error) {
      toast.error('Failed to rename file');
    }
  };

  const handleAddTags = (fileId: string, tags: string[]) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      const existingTags = file.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];
      addTags({ fileId, tags: newTags });
    }
  };

  const handleRemoveTag = async (fileId: string, tagToRemove: string) => {
    console.log('Files: Removing tag', tagToRemove, 'from file', fileId);
    
    // Safe access with null checking
    if (removeTag) {
      try {
        await removeTag({ fileId, tagToRemove });
        console.log('Files: Tag removal completed');
        
        // If the removed tag was selected in filters, remove it from selection
        if (selectedTags.includes(tagToRemove)) {
          console.log('Files: Removing tag from selected filters');
          setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
        }
      } catch (error) {
        console.error('Tag removal failed:', error);
        toast.error('Failed to remove tag');
      }
    } else {
      console.warn('removeTag function not available');
      toast.error('Tag removal not supported in this view');
    }
  };

  const handleBulkDeleteFiles = async (fileIds: string[]) => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // Custom bulk delete logic that bypasses individual toast notifications
      const filesToDelete = files.filter(f => fileIds.includes(f.id));
      let successCount = 0;
      let failedCount = 0;

      for (const file of filesToDelete) {
        try {
          // Delete from storage first
          const filesToRemove = [file.file_path];
          if (file.thumbnail_path) {
            filesToRemove.push(file.thumbnail_path);
          }

          const { error: storageError } = await supabase.storage
            .from('user-files')
            .remove(filesToRemove);

          if (storageError) {
            console.warn('Storage deletion error (continuing):', storageError);
          }

          // Delete from database
          const { error: dbError } = await supabase
            .from('files')
            .delete()
            .eq('id', file.id)
            .eq('user_id', user.id);

          if (dbError) {
            throw dbError;
          }

          successCount++;
        } catch (error) {
          console.error('Failed to delete file:', file.name, error);
          failedCount++;
        }
      }

      // Invalidate queries to refresh the file list
      queryClient.invalidateQueries({ queryKey: ['files'] });

      // Show only one final toast notification
      if (failedCount === 0) {
        toast.success(`${successCount} files deleted successfully`);
      } else if (successCount === 0) {
        toast.error(`Failed to delete ${failedCount} files`);
      } else {
        toast.warning(`${successCount} files deleted, ${failedCount} failed`);
      }

      // Clear selection
      setSelectedFiles([]);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('Bulk delete operation failed');
    }
  };

  const handleBulkTagFiles = async (fileIds: string[], tags: string[]) => {
    try {
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (file) {
          const existingTags = file.tags || [];
          const newTags = [...new Set([...existingTags, ...tags])];
          await addTags({ fileId, tags: newTags });
        }
      }
      toast.success(`Tags added to ${fileIds.length} files`);
    } catch (error) {
      console.error('Bulk tagging failed:', error);
      toast.error('Failed to add tags to some files');
    }
  };

  const handleBulkMoveFiles = async (fileIds: string[], folderId: string | null) => {
    try {
      await moveFiles({ fileIds, folderId });
      toast.success(`${fileIds.length} files moved successfully`);
    } catch (error) {
      console.error('Bulk move failed:', error);
      toast.error('Failed to move files');
    }
  };

  const categories = Array.from(new Set(files.map(f => f.category))).filter(Boolean);
  const allTags = Array.from(new Set(files.flatMap(f => f.tags || []))).filter(Boolean);
  const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);

  return (
    <div className="space-y-6">
      <FileHeader
        fileCount={files.length}
        totalSize={totalSize}
        currentFolderId={currentFolderId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <FileFilters
            currentFolderId={currentFolderId}
            onFolderSelect={setCurrentFolderId}
            categories={categories}
            allTags={allTags}
            selectedCategory={selectedCategory}
            selectedTags={selectedTags}
            onCategoryChange={setSelectedCategory}
            onTagsChange={setSelectedTags}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3 space-y-6">
          {/* Conditionally render enhanced or original upload zone */}
          {useEnhancedUpload && enhancedFiles ? (
            <EnhancedFileUploadZone 
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
            />
          ) : (
            <FileUploadZone 
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
            />
          )}

          <div className="w-full max-w-2xl mx-auto">
            <FileSearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          <EnhancedFileGrid
            files={filteredFiles}
            viewMode={viewMode}
            selectedFiles={selectedFiles}
            onFileSelect={handleFileSelect}
            onSelectAll={handleSelectAll}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRename={handleRename}
            onAddTags={handleAddTags}
            onRemoveTag={handleRemoveTag}
            onMoveFiles={handleBulkMoveFiles}
            onBulkDeleteFiles={handleBulkDeleteFiles}
            onBulkTagFiles={handleBulkTagFiles}
            isDeleting={isDeleting}
          />
        </div>
      </div>

      <FilePreview
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {showSmartOrganizer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <SmartOrganizerPanel 
            files={filteredFiles}
            onClose={() => setShowSmartOrganizer(false)}
          />
        </div>
      )}

      {showMultiModalAnalysis && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <MultiModalAnalysisPanel 
                files={selectedFiles.map(id => files.find(f => f.id === id)!).filter(Boolean)}
                onAnalysisComplete={(results) => {
                  console.log('Analysis completed:', results);
                  setShowMultiModalAnalysis(false);
                  setSelectedFiles([]);
                }}
              />
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowMultiModalAnalysis(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFileEnhancer && fileToEnhance && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <SimpleFileEnhancer 
            file={fileToEnhance}
            onClose={() => {
              setShowFileEnhancer(false);
              setFileToEnhance(null);
            }}
          />
        </div>
      )}

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={renameDialog.isOpen}
        onClose={() => setRenameDialog({ isOpen: false, fileId: '', currentName: '' })}
        onRename={handleRenameSubmit}
        currentName={renameDialog.currentName}
        title="Rename File"
        description="Enter a new name for this file."
      />
    </div>
  );
}
