
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get notes count and stats
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('word_count, is_favorite, is_pinned')
        .eq('user_id', user.id);

      if (notesError) throw notesError;

      // Get files count
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('id')
        .eq('user_id', user.id);

      if (filesError) throw filesError;

      // Get study sessions stats
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('ai_queries, duration_minutes')
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      const totalNotes = notesData?.length || 0;
      const totalFiles = filesData?.length || 0;
      const totalFavorites = notesData?.filter(note => note.is_favorite).length || 0;
      const totalPinned = notesData?.filter(note => note.is_pinned).length || 0;
      const totalWords = notesData?.reduce((sum, note) => sum + (note.word_count || 0), 0) || 0;
      const totalAIQueries = sessionsData?.reduce((sum, session) => sum + (session.ai_queries || 0), 0) || 0;
      const totalStudyHours = Math.round((sessionsData?.reduce((sum, session) => sum + (session.duration_minutes || 0), 0) || 0) / 60);

      return {
        totalNotes,
        totalFiles,
        totalFavorites,
        totalPinned,
        totalWords,
        totalAIQueries,
        totalStudyHours
      };
    },
    enabled: !!user
  });

  return {
    stats: stats || {
      totalNotes: 0,
      totalFiles: 0,
      totalFavorites: 0,
      totalPinned: 0,
      totalWords: 0,
      totalAIQueries: 0,
      totalStudyHours: 0
    },
    isLoading
  };
}
