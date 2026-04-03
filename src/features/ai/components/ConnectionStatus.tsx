import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectionStatusProps {
  isConnected: boolean;
  onReconnect: () => void;
  className?: string;
}

export function ConnectionStatus({ isConnected, onReconnect, className = '' }: ConnectionStatusProps) {
  const [showReconnectAlert, setShowReconnectAlert] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    if (!isConnected && reconnectAttempts === 0) {
      // Show alert after 5 seconds of disconnection
      const timer = setTimeout(() => {
        setShowReconnectAlert(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else if (isConnected) {
      setShowReconnectAlert(false);
      setReconnectAttempts(0);
    }
  }, [isConnected, reconnectAttempts]);

  const handleReconnect = () => {
    setReconnectAttempts(prev => prev + 1);
    onReconnect();
    toast.info('Attempting to reconnect...');
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Disconnected
            </>
          )}
        </Badge>
        
        {!isConnected && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleReconnect}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        )}
      </div>

      {showReconnectAlert && (
        <Alert className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Connection lost. Chat functionality is temporarily unavailable. 
            <Button 
              variant="link" 
              className="p-0 h-auto font-medium ml-1"
              onClick={handleReconnect}
            >
              Try reconnecting
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}