
import { FileData } from '@/hooks/useFiles';

export interface FileHookReturn {
  files: FileData[];
  isLoading: boolean;
  error: Error | null;
  uploadFiles: (files: File[], folderId?: string) => void;
  deleteFile: (fileId: string) => void;
  addTags: (data: { fileId: string; tags: string[] }) => void;
  removeTag: (data: { fileId: string; tagToRemove: string }) => void;
  moveFiles: (data: { fileIds: string[]; folderId: string | null }) => void;
  updateFile: (data: { fileId: string; updates: Partial<FileData> }) => void;
  isUploading: boolean;
  isDeleting: boolean;
}
