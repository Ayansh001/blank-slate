import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Settings, 
  MessageSquare, 
  BookOpen,
  Calendar,
  Sparkles,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';
import { EnhancedAIChat } from '@/features/ai/components/EnhancedAIChat';
import { ContextualChat } from '@/components/ai/ContextualChat';
import { SimpleServiceSelector } from '@/features/ai/components/SimpleServiceSelector';
import { QuickServiceSwitcher } from '@/features/ai/components/QuickServiceSwitcher';
import { ChatSessionDrawer } from '@/features/ai/components/ChatSessionDrawer';
import { EnhancedConceptLearner } from '@/features/concept-learner/components/EnhancedConceptLearner';
import { EnhancedSmartStudyPlanner } from '@/components/ai/EnhancedSmartStudyPlanner';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AIChatSession } from '@/features/ai/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { SessionCleanupService } from '@/features/ai/services/SessionCleanupService';

export default function AIChat() {
  const { activeConfig, configs } = useAIConfig();
  const { user } = useAuth();
  const [showConfig, setShowConfig] = useState(!activeConfig);
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
  // New state for controlled inner chat mode
  const [chatMode, setChatMode] = useState<'contextual' | 'simple'>('contextual');
  const [simpleSessionId, setSimpleSessionId] = useState<string | null>(null);

  const aiFeatures = [
    {
      id: 'chat',
      name: 'AI Chat',
      icon: MessageSquare,
      description: 'Interactive conversations with AI',
      color: 'blue'
    },
    {
      id: 'concept',
      name: 'Concept Learner',
      icon: Lightbulb,
      description: 'Deep dive into any concept',
      color: 'yellow'
    },
    {
      id: 'planner',
      name: 'Study Planner',
      icon: Calendar,
      description: 'AI-powered study schedules',
      color: 'orange'
    }
  ];

  // Cleanup empty sessions on component mount and unmount
  useEffect(() => {
    if (user) {
      // Cleanup on mount
      SessionCleanupService.cleanupEmptySessions(user.id);
      
      // Cleanup on unmount
      return () => {
        if (!hasUserInteracted && currentSession && user) {
          SessionCleanupService.cleanupEmptySessions(user.id);
        }
        // Cleanup simple session if it exists and has no messages
        if (simpleSessionId && user) {
          SessionCleanupService.hasMessages(simpleSessionId).then(hasMessages => {
            if (!hasMessages) {
              supabase
                .from('ai_chat_sessions')
                .delete()
                .eq('id', simpleSessionId)
                .eq('user_id', user.id);
            }
          });
        }
      };
    }
  }, [user, hasUserInteracted, currentSession, simpleSessionId]);

  useEffect(() => {
    if (user && activeConfig) {
      loadChatSessions();
    }
  }, [user, activeConfig]);

  const loadChatSessions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const sessionsData = data || [];
      setSessions(sessionsData);
      
      // Only set current session if one exists with messages
      if (sessionsData.length > 0) {
        const sessionWithMessages = sessionsData.find(s => s.total_messages > 0);
        if (sessionWithMessages) {
          setCurrentSession(sessionWithMessages);
        }
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSessionWhenNeeded = useCallback(async (): Promise<AIChatSession | null> => {
    if (!user || !activeConfig) return null;

    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          session_name: `New Chat - ${new Date().toLocaleDateString()}`,
          ai_service: activeConfig.service_name,
          model_used: activeConfig.model_name,
          system_prompt: 'You are a helpful AI assistant.',
          total_messages: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      setSessions(prev => [data, ...prev]);
      setCurrentSession(data);
      return data;
    } catch (error) {
      console.error('Error creating chat session:', error);
      toast.error('Failed to create new chat session');
      return null;
    }
  }, [user, activeConfig]);

  // Create a new simple chat session
  const createSimpleSession = useCallback(async (): Promise<AIChatSession | null> => {
    if (!user || !activeConfig) return null;

    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          session_name: `Simple Chat - ${new Date().toLocaleDateString()}`,
          ai_service: activeConfig.service_name,
          model_used: activeConfig.model_name,
          system_prompt: 'You are a helpful AI assistant.',
          total_messages: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      setSessions(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating simple chat session:', error);
      toast.error('Failed to create new simple chat session');
      return null;
    }
  }, [user, activeConfig]);

  // Handle chat mode changes
  const handleChatModeChange = useCallback(async (newMode: string) => {
    const mode = newMode as 'contextual' | 'simple';
    
    // If leaving simple mode, cleanup the session if it has no messages
    if (chatMode === 'simple' && simpleSessionId && user) {
      const hasMessages = await SessionCleanupService.hasMessages(simpleSessionId);
      if (!hasMessages) {
        await supabase
          .from('ai_chat_sessions')
          .delete()
          .eq('id', simpleSessionId)
          .eq('user_id', user.id);
      }
      setSimpleSessionId(null);
    }
    
    // If entering simple mode, create a new session
    if (mode === 'simple' && user && activeConfig) {
      const newSession = await createSimpleSession();
      if (newSession) {
        setSimpleSessionId(newSession.id);
      }
    }
    
    setChatMode(mode);
  }, [chatMode, simpleSessionId, user, createSimpleSession]);

  const createNewSession = async () => {
    const newSession = await createNewSessionWhenNeeded();
    if (newSession) {
      toast.success('New chat session created');
    }
    return newSession;
  };

  const renameSession = async (sessionId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_sessions')
        .update({ session_name: newName })
        .eq('id', sessionId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, session_name: newName } : s
      ));
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, session_name: newName } : null);
      }
      
      toast.success('Session renamed');
    } catch (error) {
      console.error('Error renaming session:', error);
      toast.error('Failed to rename session');
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          const sessionWithMessages = remainingSessions.find(s => s.total_messages > 0);
          setCurrentSession(sessionWithMessages || null);
        } else {
          setCurrentSession(null);
        }
      }
      
      toast.success('Session deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  // Handle user interaction tracking
  const handleUserInteraction = useCallback(() => {
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
    }
  }, [hasUserInteracted]);

  if (showConfig || !activeConfig) {
    return (
      <div className="space-y-6 h-full">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Study Assistant</h1>
            <p className="text-muted-foreground">Get intelligent help with your studies</p>
          </div>
        </div>

        <SimpleServiceSelector />
        
        {activeConfig && (
          <div className="flex justify-center">
            <Button onClick={() => setShowConfig(false)}>
              Start Chatting
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Compact Header */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shrink-0">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">AI Learning Assistant</h1>
              <p className="text-sm text-muted-foreground">
                Connected to {activeConfig.service_name === 'openai' ? 'ChatGPT' : activeConfig.service_name === 'gemini' ? 'Gemini' : 'Claude'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <QuickServiceSwitcher />
            <ChatSessionDrawer
              sessions={sessions}
              currentSession={currentSession}
              onSessionSelect={setCurrentSession}
              onCreateSession={createNewSession}
              onRenameSession={renameSession}
              onDeleteSession={deleteSession}
            />
            <Button
              variant="outline"
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">AI Settings</span>
            </Button>
          </div>
        </div>

        {/* Feature Overview - Compact */}
        <Alert className="py-2">
          <Zap className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Sessions are now created only when you start chatting, reducing storage usage.
          </AlertDescription>
        </Alert>
      </div>

      {/* AI Feature Cards - More Compact */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {aiFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card 
              key={feature.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeTab === feature.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveTab(feature.id)}
            >
              <CardContent className="p-3 text-center">
                <Icon className="h-6 w-6 mx-auto mb-1 text-primary" />
                <h3 className="font-medium text-xs sm:text-sm">{feature.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{feature.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Tools Interface - Expandable */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <TabsTrigger key={feature.id} value={feature.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{feature.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

        <TabsContent value="chat" className="h-full">
          <Tabs value={chatMode} onValueChange={handleChatModeChange} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="contextual">Contextual Chat</TabsTrigger>
              <TabsTrigger value="simple">Simple Chat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="contextual" className="flex-1 min-h-0">
              <ContextualChat 
                onUserInteraction={handleUserInteraction}
                createSessionWhenNeeded={createNewSessionWhenNeeded}
              />
            </TabsContent>
            
            <TabsContent value="simple" className="flex-1 min-h-0">
              <EnhancedAIChat 
                sessionId={simpleSessionId || undefined} 
                onUserInteraction={handleUserInteraction}
                createSessionWhenNeeded={createSimpleSession}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="concept" className="flex-1 min-h-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Concept Learner
                <Badge variant="secondary">Universal AI</Badge>
              </CardTitle>
              <CardDescription>
                Get comprehensive explanations of any concept with examples, key points, and study tips.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <EnhancedConceptLearner 
                provider={
                  activeConfig?.service_name === 'openai' ? 'openai' : 'gemini'
                } 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planner" className="flex-1 min-h-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                AI Study Planner
                <Badge variant="secondary">Universal AI</Badge>
              </CardTitle>
              <CardDescription>
                Generate personalized study plans with daily schedules, milestones, and progress tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <EnhancedSmartStudyPlanner />
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
