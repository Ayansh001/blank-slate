import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FolderOpen, Brain, TrendingUp, Plus, Clock, Star, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStats } from '@/hooks/useStats';
import { useNotes } from '@/hooks/useNotes';
import { useSimpleAIQuotes } from '@/hooks/useSimpleAIQuotes';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, isLoading } = useStats();
  const { notes } = useNotes();
  const { isLoading: quotesLoading, showNextQuote } = useSimpleAIQuotes();

  // Get recent notes for activity
  const recentNotes = notes
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  const statsData = [
    { 
      name: 'Total Notes', 
      value: stats.totalNotes.toString(), 
      icon: FileText, 
      color: 'text-blue-600',
      route: '/notes'
    },
    { 
      name: 'Files Uploaded', 
      value: stats.totalFiles.toString(), 
      icon: FolderOpen, 
      color: 'text-green-600',
      route: '/files'
    },
    { 
      name: 'AI Queries', 
      value: stats.totalAIQueries.toString(), 
      icon: Brain, 
      color: 'text-purple-600',
      route: '/ai-history'
    },
    { 
      name: 'Study Hours', 
      value: `${stats.totalStudyHours}h`, 
      icon: Clock, 
      color: 'text-orange-600',
      route: '/analytics'
    },
  ];

  const handleStatClick = (route: string) => {
    navigate(route);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Pink Glow Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #ec4899 100%)
          `,
          backgroundSize: "100% 100%",
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 space-y-6 p-6">
        {/* Welcome Section */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-800">Welcome back to StudyVault!</h1>
            <p className="text-lg mb-4 text-slate-600">Ready to continue your learning journey?</p>
            <Button 
              className="bg-pink-500 text-white hover:bg-pink-600"
              onClick={() => navigate('/notes')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Note
            </Button>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              <Quote className="h-3 w-3 mr-1" />
              {quotesLoading ? 'Loading quotes...' : 'Daily motivation ready'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <Card 
            key={stat.name} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105"
            onClick={() => handleStatClick(stat.route)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isLoading ? '...' : stat.value}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Notes
            </CardTitle>
            <CardDescription>Your latest study activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentNotes.length > 0 ? (
                recentNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => navigate(`/notes/edit/${note.id}`)}
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {note.title}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {formatTimeAgo(note.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">
                  No notes yet. Create your first note to get started!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump into your most used features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate('/notes')}
            >
              <FileText className="w-4 h-4 mr-2" />
              New Note
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate('/files')}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Upload File
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate('/chat')}
            >
              <Brain className="w-4 h-4 mr-2" />
              Ask AI
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => navigate('/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Daily Motivation</p>
              <Button 
                className="w-full justify-start" 
                variant="ghost"
                size="sm"
                onClick={showNextQuote}
                disabled={quotesLoading}
              >
                <Quote className="w-4 h-4 mr-2" />
                {quotesLoading ? 'Loading...' : 'Show Quote'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
