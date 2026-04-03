
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  HardDrive,
  Brain
} from 'lucide-react';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { useDatabaseStorage } from '@/hooks/useDatabaseStorage';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AI_HISTORY_LIMIT_BYTES, FILE_STORAGE_LIMIT_BYTES, STORAGE_LABELS } from '@/constants/storage';

export function StorageUsageIndicator() {
  const { user } = useAuth();
  const { storageUsage, isLoading, error, refreshStorageUsage } = useStorageUsage();
  const { storageData: dbStorage, isLoading: dbLoading, refreshStorage: refreshDbStorage } = useDatabaseStorage();

  const refreshAll = () => {
    refreshStorageUsage();
    refreshDbStorage();
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view your storage usage.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || dbLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load storage usage: {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={refreshAll} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!storageUsage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No storage data available. Click refresh to load your usage.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={refreshAll} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Load Storage Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getUsageColor = () => {
    if (storageUsage.isOverLimit) return 'bg-red-500';
    if (storageUsage.isNearLimit) return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  const getUsageIcon = () => {
    if (storageUsage.isOverLimit) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (storageUsage.isNearLimit) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Storage Usage
          <Button
            onClick={refreshAll}
            variant="ghost"
            size="sm"
            className="ml-auto h-8 w-8 p-0"
            title="Refresh storage data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Storage Usage Alerts */}
        {storageUsage.isOverLimit && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You've exceeded your storage limit! Please delete some files to free up space.
            </AlertDescription>
          </Alert>
        )}
        
        {storageUsage.isNearLimit && !storageUsage.isOverLimit && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're approaching your storage limit. Consider cleaning up unused files.
            </AlertDescription>
          </Alert>
        )}

        {/* Main File Storage Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getUsageIcon()}
              <span className="text-sm font-medium">Files & Documents</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {storageUsage.totalUsedFormatted} / {storageUsage.totalLimitFormatted}
            </div>
          </div>
          
          <Progress 
            value={Math.min(storageUsage.usagePercentage, 100)} 
            className="h-3"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{storageUsage.usagePercentage.toFixed(1)}% used</span>
            <span>Supabase Free Tier ({STORAGE_LABELS.FILE_STORAGE})</span>
          </div>
        </div>

        {/* Database Storage Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Database Storage</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {dbStorage?.total_formatted || '0 B'} / {STORAGE_LABELS.AI_HISTORY}
            </div>
          </div>
          
          <Progress 
            value={dbStorage ? Math.min((dbStorage.total_bytes / AI_HISTORY_LIMIT_BYTES) * 100, 100) : 0} 
            className="h-3"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{dbStorage ? ((dbStorage.total_bytes / AI_HISTORY_LIMIT_BYTES) * 100).toFixed(1) : 0}% used</span>
            <span>AI History Data</span>
          </div>
        </div>

        {/* File Category Breakdown */}
        {Object.keys(storageUsage.categoryBreakdown).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage by Category
            </h4>
            
            <div className="space-y-2">
              {Object.entries(storageUsage.categoryBreakdown)
                .sort(([, a], [, b]) => b.size - a.size)
                .slice(0, 5)
                .map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {data.count} {data.count === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{data.sizeFormatted}</span>
                      <span className="text-xs text-muted-foreground">
                        ({data.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Database Category Breakdown */}
        {dbStorage?.categories && dbStorage.categories.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI History by Type
            </h4>
            
            <div className="space-y-2">
              {dbStorage.categories
                .sort((a, b) => b.bytes - a.bytes)
                .slice(0, 5)
                .map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {category.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {category.records} records
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{category.size_formatted}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Debug Info (only visible in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Debug: Files {storageUsage.totalUsed} bytes, Database {dbStorage?.total_bytes || 0} bytes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
