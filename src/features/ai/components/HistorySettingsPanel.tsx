
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Database, 
  AlertTriangle, 
  Trash2, 
  Clock,
  Shield,
  Loader2
} from 'lucide-react';
import { useAIHistoryPreferences } from '@/hooks/useAIHistoryPreferences';
import { useDatabaseStorage } from '@/hooks/useDatabaseStorage';
import { useBulkDelete } from '../hooks/useBulkDelete';
import { toast } from 'sonner';
import { AI_HISTORY_LIMIT_BYTES } from '@/constants/storage';

const FEATURE_LABELS = {
  quiz_sessions: 'Quiz Sessions',
  chat_sessions: 'AI Chat History', 
  note_enhancements: 'Note Enhancements',
  concept_learning: 'Concept Learning',
  document_analyses: 'Document Analysis',
  usage_tracking: 'Usage Analytics'
} as const;

export function HistorySettingsPanel() {
  const { 
    preferences, 
    isLoading, 
    toggleFeature, 
    disableAllHistory, 
    enableAllHistory,
    getPreference,
    isUpdating 
  } = useAIHistoryPreferences();
  
  const { storageData, isLoading: storageLoading, refreshStorage } = useDatabaseStorage();
  const { bulkDelete, isDeleting } = useBulkDelete();

  const handleEmergencyDisable = () => {
    if (window.confirm('This will disable all AI history saving immediately. Continue?')) {
      disableAllHistory();
      toast.success('All AI history saving disabled');
    }
  };

  const handleBulkDelete = async (category: string) => {
    const categoryLabel = FEATURE_LABELS[category as keyof typeof FEATURE_LABELS] || category;
    
    if (window.confirm(`Delete all ${categoryLabel} history? This cannot be undone.`)) {
      try {
        await bulkDelete(category);
        // Refresh storage data after successful deletion
        await refreshStorage();
      } catch (error) {
        // Error is already handled in the hook
        console.error('Bulk delete failed:', error);
      }
    }
  };

  const getStorageWarningLevel = () => {
    if (!storageData) return 'safe';
    const percentage = (storageData.total_bytes / AI_HISTORY_LIMIT_BYTES) * 100;
    if (percentage >= 95) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'safe';
  };

  const warningLevel = getStorageWarningLevel();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            History Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            History Settings
          </div>
          <Badge 
            variant={warningLevel === 'critical' ? 'destructive' : 
                    warningLevel === 'warning' ? 'secondary' : 'default'}
          >
            {storageData?.total_formatted || '0 B'} used
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Storage Warning */}
        {warningLevel !== 'safe' && (
          <Alert variant={warningLevel === 'critical' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {warningLevel === 'critical' 
                ? 'AI history storage is nearly full! Consider disabling some features or deleting old data.'
                : 'AI history storage is getting full. Monitor usage or clean up old data.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Database Storage Display */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Storage Usage
          </h4>
          
          {storageData?.categories?.map((category) => (
            <div key={category.category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  checked={getPreference(category.category).is_enabled}
                  onCheckedChange={(enabled) => toggleFeature(category.category, enabled)}
                  disabled={isUpdating}
                />
                <div>
                  <span className="font-medium">
                    {FEATURE_LABELS[category.category as keyof typeof FEATURE_LABELS] || category.category}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {category.records} records • {category.size_formatted}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkDelete(category.category)}
                  disabled={category.records === 0 || isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Controls */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Emergency Controls
          </h4>
          
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEmergencyDisable}
              disabled={isUpdating}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Disable All History
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={enableAllHistory}
              disabled={isUpdating}
            >
              Enable All History
            </Button>
          </div>
        </div>

        {/* Auto-cleanup Information */}
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Automatic Cleanup</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Records older than retention period will be automatically cleaned up when auto-cleanup is enabled.
            Default retention: 90 days.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
