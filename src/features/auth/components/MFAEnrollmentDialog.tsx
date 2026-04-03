import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Copy, Check } from 'lucide-react';
import { useMFA } from '@/features/auth/hooks/useMFA';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface MFAEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MFAEnrollmentDialog = ({ open, onOpenChange }: MFAEnrollmentDialogProps) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const { enrollFactor, verifyFactor, isLoading } = useMFA();

  useEffect(() => {
    if (open && step === 'setup') {
      handleEnrollFactor();
    }
  }, [open]);

  const handleEnrollFactor = async () => {
    const result = await enrollFactor();
    if (result.qrCode && result.secret && result.factorId) {
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setFactorId(result.factorId);
    } else {
      onOpenChange(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy secret:', error);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;
    
    setIsVerifying(true);
    const result = await verifyFactor(factorId, verificationCode);
    setIsVerifying(false);
    
    if (result.success) {
      onOpenChange(false);
      // Reset state for next time
      setStep('setup');
      setQrCode('');
      setSecret('');
      setFactorId('');
      setVerificationCode('');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state
    setStep('setup');
    setQrCode('');
    setSecret('');
    setFactorId('');
    setVerificationCode('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {step === 'setup' 
              ? 'Scan the QR code with your authenticator app'
              : 'Enter the verification code from your authenticator app'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'setup' && (
          <div className="space-y-4">
            {qrCode && (
              <div className="flex justify-center">
                <img 
                  src={qrCode} 
                  alt="QR Code for MFA setup" 
                  className="border rounded-lg"
                />
              </div>
            )}

            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Manual entry key:</p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={secret} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopySecret}
                      className="shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Install an authenticator app like Google Authenticator or Authy
              </p>
              <p className="text-sm text-muted-foreground">
                2. Scan the QR code or enter the manual key
              </p>
              <p className="text-sm text-muted-foreground">
                3. Enter the 6-digit code to complete setup
              </p>
            </div>

            <Button 
              onClick={() => setStep('verify')} 
              className="w-full"
              disabled={!qrCode || isLoading}
            >
              Continue to Verification
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <div className="flex justify-center">
                <InputOTP
                  value={verificationCode}
                  onChange={setVerificationCode}
                  maxLength={6}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('setup')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="flex-1"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Enable'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};