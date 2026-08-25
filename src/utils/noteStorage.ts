
import { supabase } from '@/integrations/supabase/client';

export interface NoteStorage {
  id: string;
  title: string;
  content: string;
  plain_text: string;
  tags: string[];
  category: string;
  word_count: number;
  reading_time: number;
  is_pinned: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const noteStorage = {
  async getAllNotes(userId: string): Promise<NoteStorage[]> {
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createNote(note: Partial<NoteStorage>): Promise<NoteStorage> {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) throw new Error('User not authenticated');

    const noteData = {
      title: note.title || 'Untitled Note',
      content: note.content || '',
      plain_text: note.plain_text || '',
      tags: note.tags || [],
      category: note.category || '',
      word_count: note.word_count || 0,
      reading_time: note.reading_time || 0,
      is_pinned: note.is_pinned || false,
      is_favorite: note.is_favorite || false,
      user_id: user.user.id
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(noteData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateNote(id: string, updates: Partial<NoteStorage>): Promise<NoteStorage> {
    const { data, error } = await supabase
      .from('notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
