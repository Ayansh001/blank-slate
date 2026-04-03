
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  History, 
  FileText, 
  MessageCircle, 
  Download,
  BarChart3,
  Filter,
  AlertCircle,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Settings,
  File
} from 'lucide-react';
import { QuizHistoryList } from './QuizHistoryList';
import { NoteEnhancementHistory } from './NoteEnhancementHistory';
import { ChatSessionHistory } from './ChatSessionHistory';
import { EnhancedAnalyticsPanel } from './EnhancedAnalyticsPanel';
import { HistorySettingsPanel } from './HistorySettingsPanel';
import { UsageAnalyticsPanel } from './UsageAnalyticsPanel';
import { FilterDialog } from './FilterDialog';
import { AIHistoryErrorBoundary } from './AIHistoryErrorBoundary';
import { AIHistoryLoadingState } from './AIHistoryLoadingState';
import { HistoryFilterProvider, useHistoryFilters } from '../contexts/HistoryFilterContext';
import { useAIHistoryData } from '../hooks/useAIHistoryData';
import { useAIHistoryExport } from '../hooks/useAIHistoryExport';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { safeFormatDate } from '@/utils/dateUtils';
import { EnhancedHistoryValidationService } from '../utils/enhancedHistoryValidation';
import { HistoryCleanupService } from '../services/HistoryCleanupService';
import { toast } from 'sonner';

function AIHistoryDashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const { overview, loading, error, refreshData } = useAIHistoryData();
  const { exportData } = useAIHistoryExport();
  const { filters, setFilters, clearFilters } = useHistoryFilters();
  const [activeTab, setActiveTab] = useState('overview');
  const [validationResults, setValidationResults] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  console.log('AIHistoryDashboard: Rendering', { 
    hasUser: !!user, 
    authLoading, 
    dataLoading: loading, 
    hasOverview: !!overview,
    error 
  });

  const handleValidateData = async () => {
    if (!user) return;
    
    setIsValidating(true);
    try {
      const results = await EnhancedHistoryValidationService.validateAndRepairAllUserHistory(user.id);
      setValidationResults(results);
      
      if (results.fixed.length > 0) {
        toast.success(`Validated and repaired ${results.fixed.length} data issues`);
        refreshData();
      } else if (results.isValid) {
        toast.success('All AI history data is valid!');
      } else {
        toast.warning(`Found ${results.errors.length + results.warnings.length} data integrity issues`);
      }
    } catch (error) {
      toast.error('Validation failed: ' + (error as Error).message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkAnalyticsAction = async (action: string, category: string) => {
    if (!user) return;

    switch (action) {
      case 'export':
        exportData(category as "quizzes" | "chats" | "enhancements" | "all");
        break;
      case 'cleanup':
        try {
          toast.loading('Starting cleanup...', { id: 'cleanup' });
          
          let result;
          const options = { olderThanDays: 30, includeOrphanedRecords: true };

          switch (category) {
            case 'quizzes':
              result = await HistoryCleanupService.cleanupQuizSessions(user.id, options);
              break;
            case 'enhancements':
              result = await HistoryCleanupService.cleanupNoteEnhancements(user.id, options);
              break;
            case 'chats':
              result = await HistoryCleanupService.cleanupChatSessions(user.id, options);
              break;
            default:
              toast.error('Unknown cleanup category', { id: 'cleanup' });
              return;
          }

          if (result.success) {
            toast.success(`Cleaned up ${result.deletedCount} ${category} records`, { id: 'cleanup' });
            refreshData();
          } else {
            toast.error(`Cleanup failed: ${result.errors.join(', ')}`, { id: 'cleanup' });
          }
        } catch (error) {
          toast.error('Cleanup failed: ' + (error as Error).message, { id: 'cleanup' });
        }
        break;
      default:
        console.log(`Unknown bulk action: ${action} for ${category}`);
    }
  };

  // Show loading state during initial authentication
  if (authLoading) {
    console.log('AIHistoryDashboard: Showing auth loading state');
    return <AIHistoryLoadingState />;
  }

  // Show authentication required message
  if (!user) {
    console.log('AIHistoryDashboard: No user, showing auth prompt');
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI History Dashboard
            </CardTitle>
            <CardDescription>
              View and manage your AI interactions and generated content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please sign in to view your AI history and interactions.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state with retry option
  if (error && !loading) {
    console.log('AIHistoryDashboard: Showing error state:', error);
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI History Dashboard
            </CardTitle>
            <CardDescription>
              View and manage your AI interactions and generated content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="mb-4">
                Failed to load AI history data: {error}
              </AlertDescription>
              <Button onClick={refreshData} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state during initial data fetch
  if (loading && !overview) {
    console.log('AIHistoryDashboard: Showing data loading state');
    return <AIHistoryLoadingState />;
  }

  console.log('AIHistoryDashboard: Rendering dashboard with data', { 
    overviewData: overview ? {
      totalQuizzes: overview.totalQuizzes,
      totalEnhancements: overview.totalEnhancements,
      totalChatSessions: overview.totalChatSessions,
      recentActivityCount: overview.recentActivity?.length || 0
    } : null
  });

  return (
    <div className="space-y-6">
      {/* Header with responsive layout */}
      <div className="space-y-4 xs:space-y-0 xs:flex xs:flex-nowrap xs:items-center xs:justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/70 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold truncate">AI History Dashboard</h1>
            <p className="text-muted-foreground truncate">View and manage your AI interactions and generated content</p>
          </div>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilterDialog(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {(filters.types.length > 0 || filters.statuses.length > 0 || filters.searchTerm) && (
              <Badge variant="secondary" className="ml-2">
                {filters.types.length + filters.statuses.length + (filters.searchTerm ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleValidateData}
            disabled={isValidating}
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Validate Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportData('all')}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger 
            value="overview" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" 
            aria-label="Overview"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger 
            value="quizzes" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" 
            aria-label="Quizzes"
          >
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Quizzes</span>
          </TabsTrigger>
          <TabsTrigger 
            value="enhancements" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" 
            aria-label="Enhancements"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Enhancements</span>
          </TabsTrigger>
          <TabsTrigger 
            value="chats" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" 
            aria-label="Chat Sessions"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Chat Sessions</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" 
            aria-label="Analytics"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="flex items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" 
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Show inline loading indicator during refresh */}
          {loading && overview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing data...
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => setActiveTab('quizzes')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  Quiz Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{overview?.totalQuizzes || 0}</div>
                <p className="text-sm text-muted-foreground">Total quizzes completed</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary">
                    Avg Score: {overview?.averageQuizScore ? overview.averageQuizScore.toFixed(0) : 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => setActiveTab('enhancements')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Note Enhancements
                  {overview?.totalEnhancements === 0 && (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{overview?.totalEnhancements || 0}</div>
                <p className="text-sm text-muted-foreground">Notes enhanced with AI</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary">{overview?.appliedEnhancements || 0} Applied</Badge>
                  {overview?.totalEnhancements === 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      No Data - Check Learn Page
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
              onClick={() => setActiveTab('chats')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-500" />
                  Chat Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{overview?.totalChatSessions || 0}</div>
                <p className="text-sm text-muted-foreground">AI conversations</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="secondary">{overview?.totalMessages || 0} Messages</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest AI interactions</CardDescription>
                </div>
                <Button onClick={refreshData} variant="outline" size="sm" className="gap-2" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {overview?.recentActivity?.length ? (
                <div className="space-y-4">
                  {overview.recentActivity.map((activity) => {
                    const icons = {
                      quiz: Brain,
                      enhancement: FileText,
                      file_enhancement: File,
                      chat: MessageCircle
                    };
                    const colors = {
                      quiz: 'text-blue-500',
                      enhancement: 'text-green-500',
                      file_enhancement: 'text-orange-500',
                      chat: 'text-purple-500'
                    };
                    const Icon = icons[activity.type] || FileText;
                    const iconColor = colors[activity.type] || 'text-gray-500';
                    
                    return (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                        <div className="flex-1">
                          <div className="font-medium">{activity.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.subtitle} • {safeFormatDate(activity.timestamp, 'MMM d, HH:mm')}
                          </div>
                        </div>
                        <Badge variant={activity.status === 'Completed' ? 'default' : activity.status === 'Applied' ? 'secondary' : 'outline'}>
                          {activity.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Recent Activity</h3>
                  <p className="text-muted-foreground">
                    Start using AI features to see your activity here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes">
          <AIHistoryErrorBoundary>
            <QuizHistoryList />
          </AIHistoryErrorBoundary>
        </TabsContent>

        <TabsContent value="enhancements">
          <AIHistoryErrorBoundary>
            <NoteEnhancementHistory />
          </AIHistoryErrorBoundary>
        </TabsContent>

        <TabsContent value="chats">
          <AIHistoryErrorBoundary>
            <ChatSessionHistory />
          </AIHistoryErrorBoundary>
        </TabsContent>

        <TabsContent value="analytics">
          <AIHistoryErrorBoundary>
            <UsageAnalyticsPanel />
          </AIHistoryErrorBoundary>
        </TabsContent>

        <TabsContent value="settings">
          <AIHistoryErrorBoundary>
            <HistorySettingsPanel />
          </AIHistoryErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Filter Dialog */}
      <FilterDialog
        open={showFilterDialog}
        onOpenChange={setShowFilterDialog}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />
    </div>
  );
}

export function AIHistoryDashboard() {
  return (
    <HistoryFilterProvider>
      <AIHistoryDashboardContent />
    </HistoryFilterProvider>
  );
}
