import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePasswordUpdateReturn {
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isUpdating: boolean;
}

export const usePasswordUpdate = (): UsePasswordUpdateReturn => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    setIsUpdating(true);
    
    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('No authenticated user found');
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        return { success: false, error: 'Current password is incorrect' };
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        toast.error('Failed to update password: ' + updateError.message);
        return { success: false, error: updateError.message };
      }

      toast.success('Password updated successfully');
      return { success: true };

    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred';
      toast.error('Password update failed: ' + errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updatePassword,
    isUpdating
  };
};