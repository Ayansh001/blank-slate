
import { Button } from '@/components/ui/button';
import { Grid3X3, List } from 'lucide-react';
import { formatFileSize } from '../utils/fileUtils';

interface FileHeaderProps {
  fileCount: number;
  totalSize: number;
  currentFolderId: string | null;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function FileHeader({ 
  fileCount, 
  totalSize, 
  currentFolderId, 
  viewMode, 
  onViewModeChange 
}: FileHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Files</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {fileCount} files • {formatFileSize(totalSize)} total
          {currentFolderId && ' • Current folder'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('list')}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
