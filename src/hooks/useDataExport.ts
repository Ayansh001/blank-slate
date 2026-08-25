
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';

export function useDataExport() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const exportAllData = async () => {
    if (!user) {
      toast.error('You must be logged in to export data');
      return;
    }

    setIsExporting(true);
    
    try {
      // Fetch all user data
      const [
        { data: files },
        { data: notes },
        { data: folders },
        { data: quizSessions },
        { data: advancedQuizSessions },
        { data: aiChatSessions },
        { data: studyPlans },
        { data: studyGoals }
      ] = await Promise.all([
        supabase.from('files').select('*').eq('user_id', user.id),
        supabase.from('notes').select('*').eq('user_id', user.id),
        supabase.from('folders').select('*').eq('user_id', user.id),
        supabase.from('quiz_sessions').select('*').eq('user_id', user.id),
        supabase.from('advanced_quiz_sessions').select('*').eq('user_id', user.id),
        supabase.from('ai_chat_sessions').select('*').eq('user_id', user.id),
        supabase.from('study_plans').select('*').eq('user_id', user.id),
        supabase.from('study_goals').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        data: {
          files: files || [],
          notes: notes || [],
          folders: folders || [],
          quizSessions: quizSessions || [],
          advancedQuizSessions: advancedQuizSessions || [],
          aiChatSessions: aiChatSessions || [],
          studyPlans: studyPlans || [],
          studyGoals: studyGoals || []
        },
        metadata: {
          totalFiles: files?.length || 0,
          totalNotes: notes?.length || 0,
          totalFolders: folders?.length || 0,
          totalQuizSessions: (quizSessions?.length || 0) + (advancedQuizSessions?.length || 0),
          totalChatSessions: aiChatSessions?.length || 0,
          totalStudyPlans: studyPlans?.length || 0,
          totalStudyGoals: studyGoals?.length || 0
        }
      };

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyvault-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!', {
        description: `Exported ${exportData.metadata.totalFiles + exportData.metadata.totalNotes} items`
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export data', {
        description: error.message
      });
    } finally {
      setIsExporting(false);
    }
  };

  const backupSettings = async () => {
    if (!user) {
      toast.error('You must be logged in to backup settings');
      return;
    }

    try {
      // Fetch user settings and configurations
      const [
        { data: aiConfigs },
        { data: profile }
      ] = await Promise.all([
        supabase.from('ai_service_configs').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      const settingsData = {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        settings: {
          aiServiceConfigs: aiConfigs || [],
          profile: profile || {},
          // Add other settings as needed
        }
      };

      const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyvault-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Settings backed up successfully!');

    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error('Failed to backup settings', {
        description: error.message
      });
    }
  };

  return {
    exportAllData,
    backupSettings,
    isExporting
  };
}
