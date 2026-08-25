import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Note } from '@/types/note';
import { calculateReadingTime, getWordCount, stripHtml } from '@/utils/noteUtils';
import { toast } from 'sonner';

export function useNotes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log('Fetching notes for user:', user.id);
      
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        throw error;
      }
      
      return data.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content || '',
        plainText: note.plain_text || '',
        tags: note.tags || [],
        category: note.category || '',
        wordCount: note.word_count || 0,
        readingTime: note.reading_time || 0,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        isPinned: note.is_pinned || false,
        isFavorite: note.is_favorite || false
      })) as Note[];
    },
    enabled: !!user
  });

  // Helper function to check if content is meaningful (not just template placeholders)
  const hasContent = (title: string, content: string) => {
    const plainText = stripHtml(content);
    const titleTrimmed = title.trim();
    const contentTrimmed = plainText.trim();
    
    // Check if title is not just "Untitled Note" or template name
    const hasMeaningfulTitle = titleTrimmed && 
      !titleTrimmed.startsWith('Untitled') && 
      titleTrimmed.length > 3;
    
    // Check if content has more than just template structure
    const hasMeaningfulContent = contentTrimmed.length > 50 && 
      !contentTrimmed.includes('strong>Date:</strong>') && // Not just template
      contentTrimmed.split(' ').length > 10; // More than basic template words
    
    return hasMeaningfulTitle || hasMeaningfulContent;
  };

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: Partial<Note> & { skipContentCheck?: boolean }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Don't create notes with only template content unless explicitly requested
      if (!noteData.skipContentCheck && !hasContent(noteData.title || '', noteData.content || '')) {
        throw new Error('Please add some content before saving your note');
      }

      console.log('Creating note for user:', user.id);
      console.log('Note data:', noteData);

      // Ensure user profile exists before creating note
      try {
        const { error: profileError } = await supabase.rpc('ensure_user_profile', {
          _user_id: user.id
        });
        
        if (profileError) {
          console.warn('Warning: Could not ensure profile exists:', profileError);
        }
      } catch (profileCheckError) {
        console.warn('Warning: Profile check failed:', profileCheckError);
      }

      const plainText = stripHtml(noteData.content || '');
      const noteToInsert = {
        user_id: user.id,
        title: noteData.title || 'Untitled Note',
        content: noteData.content || '',
        plain_text: plainText,
        tags: noteData.tags || [],
        category: noteData.category || '',
        word_count: getWordCount(plainText),
        reading_time: calculateReadingTime(plainText),
        is_pinned: noteData.isPinned || false,
        is_favorite: noteData.isFavorite || false
      };

      console.log('Inserting note:', noteToInsert);

      const { data, error } = await supabase
        .from('notes')
        .insert(noteToInsert)
        .select()
        .single();

      if (error) {
        console.error('Error creating note:', error);
        
        // Provide more helpful error messages
        if (error.code === '23503' && error.message.includes('notes_user_id_fkey')) {
          throw new Error('Profile not found. Please try logging out and back in, then try again.');
        }
        
        throw error;
      }
      
      console.log('Note created successfully:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note saved successfully');
      console.log('Note creation successful, created note:', data);
    },
    onError: (error) => {
      console.error('Create note mutation error:', error);
      toast.error('Failed to save note: ' + error.message);
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, ...noteData }: Note) => {
      if (!user) throw new Error('User not authenticated');

      const plainText = stripHtml(noteData.content || '');
      const { data, error } = await supabase
        .from('notes')
        .update({
          title: noteData.title,
          content: noteData.content,
          plain_text: plainText,
          tags: noteData.tags,
          category: noteData.category,
          word_count: getWordCount(plainText),
          reading_time: calculateReadingTime(plainText),
          is_pinned: noteData.isPinned,
          is_favorite: noteData.isFavorite
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update note: ' + error.message);
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete note: ' + error.message);
    }
  });

  return {
    notes,
    isLoading,
    error,
    createNote: createNoteMutation.mutate,
    updateNote: updateNoteMutation.mutate,
    deleteNote: deleteNoteMutation.mutate,
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
    hasContent
  };
}
