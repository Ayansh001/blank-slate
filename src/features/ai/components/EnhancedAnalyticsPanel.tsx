
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Download,
  Trash2,
  Brain,
  FileText,
  MessageCircle,
  Database
} from 'lucide-react';
import { useAIHistoryData } from '../hooks/useAIHistoryData';
import { useDatabaseStorage } from '@/hooks/useDatabaseStorage';
import { AI_HISTORY_LIMIT_BYTES, STORAGE_LABELS } from '@/constants/storage';
import { UsageAnalyticsPanel } from './UsageAnalyticsPanel';

interface EnhancedAnalyticsPanelProps {
  onBulkAction: (action: string, category: string) => void;
}

export function EnhancedAnalyticsPanel({ onBulkAction }: EnhancedAnalyticsPanelProps) {
  const { overview, loading } = useAIHistoryData();
  const { storageData } = useDatabaseStorage();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStoragePercentage = () => {
    if (!storageData?.total_bytes) return 0;
    return Math.min((storageData.total_bytes / AI_HISTORY_LIMIT_BYTES) * 100, 100);
  };

  const analyticsData = [
    {
      category: 'quizzes',
      name: 'Quiz Sessions',
      count: overview?.totalQuizzes || 0,
      icon: Brain,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      description: `Average score: ${overview?.averageQuizScore?.toFixed(0) || 0}%`
    },
    {
      category: 'enhancements',
      name: 'Note Enhancements',
      count: overview?.totalEnhancements || 0,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      description: `${overview?.appliedEnhancements || 0} applied`
    },
    {
      category: 'chats',
      name: 'Chat Sessions',
      count: overview?.totalChatSessions || 0,
      icon: MessageCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      description: `${overview?.totalMessages || 0} total messages`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
          <CardDescription>
            Comprehensive view of your AI interactions and data usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analyticsData.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.category} className={`p-4 rounded-lg ${item.bgColor} border`}>
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`h-5 w-5 ${item.color}`} />
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                  <h3 className="font-medium mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBulkAction('export', item.category)}
                      disabled={item.count === 0}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBulkAction('cleanup', item.category)}
                      disabled={item.count === 0}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Cleanup
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Storage Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Analytics
          </CardTitle>
          <CardDescription>
            Database usage and storage breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Storage Used</span>
              <Badge variant={getStoragePercentage() > 80 ? 'destructive' : 'secondary'}>
                {storageData?.total_formatted || '0 B'}
              </Badge>
            </div>
            
            <Progress value={getStoragePercentage()} className="w-full" />
            
            <div className="text-xs text-muted-foreground">
              {getStoragePercentage().toFixed(1)}% of {STORAGE_LABELS.AI_HISTORY} storage limit used
            </div>

            {storageData?.categories && (
              <div className="space-y-2 mt-4">
                <h4 className="text-sm font-medium">Storage Breakdown</h4>
                {storageData.categories.map((category) => (
                  <div key={category.category} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{category.category.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{category.records} records</span>
                      <Badge variant="outline" className="text-xs">
                        {category.size_formatted}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Patterns - Now showing real analytics */}
      <UsageAnalyticsPanel />
    </div>
  );
}
