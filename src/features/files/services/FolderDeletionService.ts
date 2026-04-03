
import { supabase } from '@/integrations/supabase/client';
import { FileData } from '@/hooks/useFiles';
import { FolderData } from '../hooks/useFolders';

export interface FolderContents {
  files: FileData[];
  subfolders: FolderData[];
  totalFiles: number;
  totalSubfolders: number;
}

export class FolderDeletionService {
  static async getFolderContents(folderId: string, userId: string): Promise<FolderContents> {
    // Get direct files in the folder
    const { data: files, error: filesError } = await supabase
      .from('files')
      .select('*')
      .eq('folder_id', folderId)
      .eq('user_id', userId);

    if (filesError) throw filesError;

    // Get direct subfolders
    const { data: subfolders, error: foldersError } = await supabase
      .from('folders')
      .select('*')
      .eq('parent_id', folderId)
      .eq('user_id', userId);

    if (foldersError) throw foldersError;

    // Recursively count files in subfolders
    let totalFiles = files?.length || 0;
    let totalSubfolders = subfolders?.length || 0;

    if (subfolders) {
      for (const subfolder of subfolders) {
        const subContents = await this.getFolderContents(subfolder.id, userId);
        totalFiles += subContents.totalFiles;
        totalSubfolders += subContents.totalSubfolders;
      }
    }

    return {
      files: (files || []) as FileData[],
      subfolders: (subfolders || []) as FolderData[],
      totalFiles,
      totalSubfolders
    };
  }

  static async deleteFilesFromStorage(files: FileData[]): Promise<void> {
    if (files.length === 0) return;

    const filesToDelete: string[] = [];
    
    files.forEach(file => {
      filesToDelete.push(file.file_path);
      if (file.thumbnail_path) {
        filesToDelete.push(file.thumbnail_path);
      }
    });

    const { error } = await supabase.storage
      .from('user-files')
      .remove(filesToDelete);

    if (error) {
      console.warn('Storage deletion error (continuing):', error);
    }
  }

  static async deleteFolderRecursively(folderId: string, userId: string): Promise<void> {
    const contents = await this.getFolderContents(folderId, userId);

    // Delete all files from storage first
    await this.deleteFilesFromStorage(contents.files);

    // Delete all files from database
    if (contents.files.length > 0) {
      const { error: filesError } = await supabase
        .from('files')
        .delete()
        .eq('folder_id', folderId)
        .eq('user_id', userId);

      if (filesError) throw filesError;
    }

    // Recursively delete subfolders
    for (const subfolder of contents.subfolders) {
      await this.deleteFolderRecursively(subfolder.id, userId);
    }

    // Finally delete the folder itself
    const { error: folderError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userId);

    if (folderError) throw folderError;
  }
}
