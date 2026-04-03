
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderData, useFolders } from '../hooks/useFolders';
import { FolderDeleteConfirmationDialog } from './FolderDeleteConfirmationDialog';
import { FolderContents } from '../services/FolderDeletionService';

interface FolderTreeProps {
  currentFolderId?: string;
  onFolderSelect: (folderId: string | null) => void;
}

export function FolderTree({ currentFolderId, onFolderSelect }: FolderTreeProps) {
  const { folderTree, createFolder, deleteFolder, checkFolderContents, renameFolder } = useFolders();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderParent, setCreateFolderParent] = useState<string | null>(null);
  
  // New state for deletion confirmation
  const [folderToDelete, setFolderToDelete] = useState<FolderData | null>(null);
  const [folderContents, setFolderContents] = useState<FolderContents | null>(null);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = (parentId?: string) => {
    if (newFolderName.trim()) {
      createFolder({ name: newFolderName.trim(), parentId });
      setNewFolderName('');
      setCreateFolderParent(null);
    }
  };

  const handleRenameFolder = (folderId: string) => {
    if (newFolderName.trim()) {
      renameFolder({ folderId, newName: newFolderName.trim() });
      setNewFolderName('');
      setEditingFolder(null);
    }
  };

  const handleDeleteClick = async (folder: FolderData) => {
    setFolderToDelete(folder);
    setIsLoadingContents(true);
    setShowDeleteDialog(true);

    try {
      const contents = await checkFolderContents(folder.id);
      setFolderContents(contents);
    } catch (error) {
      console.error('Error checking folder contents:', error);
      setFolderContents(null);
    } finally {
      setIsLoadingContents(false);
    }
  };

  const handleConfirmDelete = () => {
    if (folderToDelete) {
      deleteFolder(folderToDelete.id);
      handleCloseDeleteDialog();
    }
  };

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false);
    setFolderToDelete(null);
    setFolderContents(null);
    setIsLoadingContents(false);
  };

  const renderFolder = (folder: FolderData & { children?: FolderData[] }, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id} className="select-none">
        <div 
          className={`flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 cursor-pointer ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => toggleFolder(folder.id)}
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          ) : (
            <div className="w-4" />
          )}
          
          <div 
            className="flex items-center gap-2 flex-1"
            onClick={() => onFolderSelect(folder.id)}
          >
            {isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
            {editingFolder === folder.id ? (
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => handleRenameFolder(folder.id)}
                onKeyPress={(e) => e.key === 'Enter' && handleRenameFolder(folder.id)}
                className="h-6 text-sm"
                autoFocus
              />
            ) : (
              <span className="text-sm">{folder.name}</span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCreateFolderParent(folder.id)}>
                <Plus className="h-4 w-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setEditingFolder(folder.id);
                  setNewFolderName(folder.name);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteClick(folder)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {createFolderParent === folder.id && (
          <div style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }} className="mt-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder(folder.id)}
              onBlur={() => setCreateFolderParent(null)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
        )}

        {isExpanded && hasChildren && (
          <div className="mt-1">
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Folders</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateFolderParent('')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div 
            className={`flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 cursor-pointer mb-2 ${
              !currentFolderId ? 'bg-blue-50 border border-blue-200' : ''
            }`}
            onClick={() => onFolderSelect(null)}
          >
            <Folder className="h-4 w-4" />
            <span className="text-sm">All Files</span>
          </div>

          {createFolderParent === '' && (
            <div className="mb-2">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                onBlur={() => setCreateFolderParent(null)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-1">
            {folderTree.map(folder => renderFolder(folder))}
          </div>
        </CardContent>
      </Card>

      <FolderDeleteConfirmationDialog
        folder={folderToDelete}
        contents={folderContents}
        isOpen={showDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        isDeleting={false}
        isLoadingContents={isLoadingContents}
      />
    </>
  );
}
