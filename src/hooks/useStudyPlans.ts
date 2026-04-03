import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { toast } from 'sonner';

export interface StudyPlan {
  id: string;
  user_id: string;
  title: string;
  total_days: number;
  hours_per_day: number;
  selected_notes: SelectedNote[];
  daily_schedule: DailyTask[];
  progress: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseStudyPlan {
  id: string;
  user_id: string;
  title: string;
  total_days: number;
  hours_per_day: number;
  selected_notes: any;
  daily_schedule: any;
  progress: any;
  created_at: string;
  updated_at: string;
}

export interface SelectedNote {
  id: string;
  title: string;
  content: string;
  description: string;
}

export interface DailyTask {
  day: number;
  date: string;
  tasks: Task[];
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  detailedExplanation?: string;
  estimatedTime: string;
  completed: boolean;
  noteReference: string;
}

export function useStudyPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: studyPlans = [], isLoading, error } = useQuery({
    queryKey: ['study-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Transform database data to proper types
      return (data || []).map((plan): StudyPlan => ({
        ...plan,
        selected_notes: Array.isArray(plan.selected_notes) ? plan.selected_notes as unknown as SelectedNote[] : [],
        daily_schedule: Array.isArray(plan.daily_schedule) ? plan.daily_schedule as unknown as DailyTask[] : [],
        progress: typeof plan.progress === 'object' && plan.progress !== null ? plan.progress as unknown as Record<string, boolean> : {}
      }));
    },
    enabled: !!user
  });

  const createStudyPlanMutation = useMutation({
    mutationFn: async (planData: {
      title: string;
      totalDays: number;
      hoursPerDay: number;
      selectedNotes: SelectedNote[];
      dailySchedule: DailyTask[];
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('study_plans')
        .insert([{
          user_id: user.id,
          title: planData.title,
          total_days: planData.totalDays,
          hours_per_day: planData.hoursPerDay,
          selected_notes: planData.selectedNotes as any,
          daily_schedule: planData.dailySchedule as any,
          progress: {} as any
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      toast.success('Study plan created successfully!');
      return data; // Return the created plan for immediate use
    },
    onError: (error) => {
      toast.error('Failed to create study plan: ' + error.message);
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ planId, taskId, completed }: { planId: string; taskId: string; completed: boolean }) => {
      if (!user) throw new Error('User not authenticated');

      // Get current plan
      const { data: currentPlan, error: fetchError } = await supabase
        .from('study_plans')
        .select('progress, daily_schedule')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update progress
      const currentProgress = (currentPlan.progress as unknown as Record<string, boolean>) || {};
      const newProgress = { ...currentProgress, [taskId]: completed };

      // Update daily schedule with completed tasks
      const currentSchedule = (currentPlan.daily_schedule as unknown) as DailyTask[];
      const updatedSchedule = currentSchedule.map((day: DailyTask) => {
        const updatedTasks = day.tasks?.map((task: Task) => 
          task.id === taskId ? { ...task, completed } : task
        ) || [];
        
        const dayCompleted = updatedTasks.every((task: Task) => 
          newProgress[task.id] || false
        );
        
        return {
          ...day,
          tasks: updatedTasks,
          completed: dayCompleted
        };
      });

      const { data, error } = await supabase
        .from('study_plans')
        .update({
          progress: newProgress as any,
          daily_schedule: updatedSchedule as any
        })
        .eq('id', planId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      toast.success('Progress updated!');
    },
    onError: (error) => {
      toast.error('Failed to update progress: ' + error.message);
    }
  });

  const deleteStudyPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      toast.success('Study plan deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete study plan: ' + error.message);
    }
  });

  return {
    studyPlans,
    isLoading,
    error,
    createStudyPlan: createStudyPlanMutation.mutate,
    updateProgress: updateProgressMutation.mutate,
    deleteStudyPlan: deleteStudyPlanMutation.mutate,
    isCreating: createStudyPlanMutation.isPending,
    isUpdating: updateProgressMutation.isPending,
    isDeleting: deleteStudyPlanMutation.isPending
  };
}