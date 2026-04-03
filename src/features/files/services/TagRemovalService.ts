
import { supabase } from '@/integrations/supabase/client';

export class TagRemovalService {
  static async removeTagOptimized(fileId: string, tagToRemove: string, userId: string) {
    console.log('TagRemovalService: Removing tag', tagToRemove, 'from file', fileId);
    
    // Direct method since RPC doesn't exist - get current file data
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('tags')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('TagRemovalService: Failed to fetch file:', fetchError);
      throw fetchError;
    }

    // Remove the specific tag from the array
    const currentTags = file.tags || [];
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
    
    console.log('TagRemovalService: Current tags:', currentTags);
    console.log('TagRemovalService: Updated tags:', updatedTags);

    // Update the file with new tags array
    const { error } = await supabase
      .from('files')
      .update({ tags: updatedTags })
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) {
      console.error('TagRemovalService: Failed to update file:', error);
      throw error;
    }

    console.log('TagRemovalService: Tag removed successfully');
    return updatedTags;
  }

  static async removeTagFallback(fileId: string, tagToRemove: string, userId: string) {
    // This is now the same as the optimized method since RPC doesn't exist
    return this.removeTagOptimized(fileId, tagToRemove, userId);
  }
}
