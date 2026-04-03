import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MFAFactor {
  id: string;
  type?: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

interface UseMFAReturn {
  factors: MFAFactor[];
  isLoading: boolean;
  enrollFactor: () => Promise<{ qrCode?: string; secret?: string; factorId?: string; error?: string }>;
  verifyFactor: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  unenrollFactor: (factorId: string) => Promise<{ success: boolean; error?: string }>;
  refreshFactors: () => Promise<void>;
  hasMFA: boolean;
}

export const useMFA = (): UseMFAReturn => {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data.all.map(factor => ({
        ...factor,
        type: 'totp' as const
      })) as MFAFactor[]);
    } catch (error: any) {
      console.error('Error fetching MFA factors:', error);
    }
  };

  useEffect(() => {
    refreshFactors();
  }, []);

  const enrollFactor = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'StudyVault',
      });

      if (error) {
        toast.error('Failed to enroll MFA: ' + error.message);
        return { error: error.message };
      }

      return {
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to enroll MFA';
      toast.error(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyFactor = async (factorId: string, code: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code
      });

      if (error) {
        toast.error('Invalid verification code');
        return { success: false, error: error.message };
      }

      toast.success('Two-factor authentication enabled successfully');
      await refreshFactors();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Verification failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const unenrollFactor = async (factorId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) {
        toast.error('Failed to disable MFA: ' + error.message);
        return { success: false, error: error.message };
      }

      toast.success('Two-factor authentication disabled');
      await refreshFactors();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to disable MFA';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const hasMFA = factors.some(factor => factor.status === 'verified');

  return {
    factors,
    isLoading,
    enrollFactor,
    verifyFactor,
    unenrollFactor,
    refreshFactors,
    hasMFA
  };
};