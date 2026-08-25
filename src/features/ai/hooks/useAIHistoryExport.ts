
import { useCallback } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export type ExportDataType = 'quizzes' | 'chats' | 'enhancements' | 'all';

export function useAIHistoryExport() {
  const { user } = useAuth();

  const exportData = useCallback(async (dataType: ExportDataType) => {
    if (!user) {
      toast.error('Please sign in to export data');
      return;
    }

    try {
      let exportData: any[] = [];
      const timestamp = format(new Date(), 'yyyy-MM-dd');

      switch (dataType) {
        case 'quizzes': {
          const { data } = await supabase
            .from('quiz_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('completed', true);
          
          exportData = data || [];
          break;
        }

        case 'enhancements': {
          try {
            const { data } = await supabase
              .from('note_enhancements')
              .select('*')
              .eq('user_id', user.id);
            
            exportData = data || [];
          } catch (error) {
            console.warn('Note enhancements table not available');
            exportData = [];
          }
          break;
        }

        case 'chats': {
          try {
            const { data } = await supabase
              .from('ai_chat_sessions')
              .select('*')
              .eq('user_id', user.id);
            
            exportData = data || [];
          } catch (error) {
            console.warn('Chat sessions table not available');
            exportData = [];
          }
          break;
        }

        case 'all': {
          const allData: any = { exported_at: new Date().toISOString() };

          // Export quizzes
          try {
            const { data: quizzes } = await supabase
              .from('quiz_sessions')
              .select('*')
              .eq('user_id', user.id)
              .eq('completed', true);
            allData.quizzes = quizzes || [];
          } catch (error) {
            allData.quizzes = [];
          }

          // Export enhancements
          try {
            const { data: enhancements } = await supabase
              .from('note_enhancements')
              .select('*')
              .eq('user_id', user.id);
            allData.enhancements = enhancements || [];
          } catch (error) {
            allData.enhancements = [];
          }

          // Export chats
          try {
            const { data: chats } = await supabase
              .from('ai_chat_sessions')
              .select('*')
              .eq('user_id', user.id);
            allData.chats = chats || [];
          } catch (error) {
            allData.chats = [];
          }

          exportData = [allData];
          break;
        }
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-history-${dataType}-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${dataType} data exported successfully`);
    } catch (error) {
      toast.error('Export failed: ' + (error as Error).message);
    }
  }, [user]);

  return { exportData };
}
