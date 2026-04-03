import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Smartphone, AlertTriangle } from 'lucide-react';
import { useMFA } from '@/features/auth/hooks/useMFA';
import { MFAEnrollmentDialog } from './MFAEnrollmentDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const MFASettings = () => {
  const { factors, isLoading, unenrollFactor, hasMFA } = useMFA();
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleToggleMFA = async (enabled: boolean) => {
    if (enabled) {
      setShowEnrollment(true);
    } else {
      // Disable MFA
      const verifiedFactor = factors.find(f => f.status === 'verified');
      if (verifiedFactor) {
        setIsDisabling(true);
        const result = await unenrollFactor(verifiedFactor.id);
        setIsDisabling(false);
        
        if (!result.success) {
          // Switch will revert automatically due to state not changing
        }
      }
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with time-based codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Secure your account with authenticator app codes
              </p>
            </div>
            <Switch 
              checked={hasMFA}
              onCheckedChange={handleToggleMFA}
              disabled={isLoading || isDisabling}
            />
          </div>

          {hasMFA && (
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is active. You'll need your authenticator app to sign in.
              </AlertDescription>
            </Alert>
          )}

          {!hasMFA && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your account is not protected by two-factor authentication. Enable it for better security.
              </AlertDescription>
            </Alert>
          )}

          {hasMFA && (
            <div className="pt-4 border-t">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Active Factors</h4>
                {factors
                  .filter(factor => factor.status === 'verified')
                  .map(factor => (
                    <div key={factor.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <span className="text-sm">Authenticator App</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Added {new Date(factor.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MFAEnrollmentDialog 
        open={showEnrollment}
        onOpenChange={setShowEnrollment}
      />
    </>
  );
};