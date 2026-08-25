
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Brain, 
  Plus, 
  X, 
  Book,
  MessageSquare,
  Sparkles,
  Save
} from 'lucide-react';
import { EnhancedAIChat } from '@/features/ai/components/EnhancedAIChat';
import { useFiles } from '@/hooks/useFiles';
import { useNotes } from '@/hooks/useNotes';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAIConfig } from '@/features/ai/hooks/useAIConfig';
import { supabase } from '@/integrations/supabase/client';
import { AIChatSession } from '@/features/ai/types';
import { toast } from 'sonner';
import { SessionCleanupService } from '@/features/ai/services/SessionCleanupService';

interface ContextItem {
  id: string;
  type: 'file' | 'note';
  name: string;
  content: string;
  summary?: string;
}

interface ContextualChatProps {
  initialContext?: ContextItem[];
  onUserInteraction?: () => void;
  createSessionWhenNeeded?: () => Promise<AIChatSession | null>;
}

export function ContextualChat({ 
  initialContext = [],
  onUserInteraction,
  createSessionWhenNeeded 
}: ContextualChatProps) {
  const { files } = useFiles();
  const { notes, createNote } = useNotes();
  const { user } = useAuth();
  const { activeConfig } = useAIConfig();
  const [selectedContext, setSelectedContext] = useState<ContextItem[]>(initialContext);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const [lastAIResponse, setLastAIResponse] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);

  // Remove auto session creation on mount - only create when context is added
  
  // Create session when context is first added (0 -> 1+)
  useEffect(() => {
    if (selectedContext.length > 0 && !currentSession && user && activeConfig) {
      createContextualChatSession();
    }
  }, [selectedContext.length, currentSession, user, activeConfig]);

  // Cleanup session on unmount if it has no messages
  useEffect(() => {
    return () => {
      if (currentSession && user) {
        SessionCleanupService.hasMessages(currentSession.id).then(hasMessages => {
          if (!hasMessages) {
            supabase
              .from('ai_chat_sessions')
              .delete()
              .eq('id', currentSession.id)
              .eq('user_id', user.id);
          }
        });
      }
    };
  }, [currentSession, user]);

  const createContextualChatSession = async () => {
    if (!user || !activeConfig) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          session_name: `Contextual Chat - ${new Date().toLocaleDateString()}`,
          ai_service: activeConfig.service_name,
          model_used: activeConfig.model_name,
          system_prompt: createSystemPrompt(selectedContext)
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSession(data);
      console.log('Created contextual chat session:', data.id);
    } catch (error) {
      console.error('Error creating contextual chat session:', error);
      toast.error('Failed to create chat session');
    }
  };

  // Update session when context changes
  useEffect(() => {
    if (currentSession && selectedContext.length >= 0) {
      updateSessionSystemPrompt();
    }
  }, [selectedContext, currentSession]);

  const updateSessionSystemPrompt = async () => {
    if (!currentSession) return;

    try {
      const newSystemPrompt = createSystemPrompt(selectedContext);
      const { error } = await supabase
        .from('ai_chat_sessions')
        .update({ 
          system_prompt: newSystemPrompt,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSession.id);

      if (error) throw error;
      
      setCurrentSession(prev => prev ? { 
        ...prev, 
        system_prompt: newSystemPrompt 
      } : null);
    } catch (error) {
      console.error('Error updating session system prompt:', error);
    }
  };

  const availableFiles = files
    .filter(f => f.ocr_text && f.ocr_status === 'completed')
    .map(f => ({
      id: f.id,
      type: 'file' as const,
      name: f.name,
      content: f.ocr_text || '',
      summary: f.ocr_text?.slice(0, 200) + '...'
    }));

  const availableNotes = notes.map(n => ({
    id: n.id,
    type: 'note' as const,
    name: n.title,
    content: n.plainText || n.content || '',
    summary: (n.plainText || n.content || '').slice(0, 200) + '...'
  }));

  const allAvailableContext = [...availableFiles, ...availableNotes];

  const addToContext = (item: ContextItem) => {
    if (!selectedContext.find(c => c.id === item.id && c.type === item.type)) {
      setSelectedContext(prev => [...prev, item]);
    }
  };

  const removeFromContext = (id: string, type: string) => {
    setSelectedContext(prev => prev.filter(c => !(c.id === id && c.type === type)));
  };

  // Save AI insights to Notes
  const handleSaveToNotes = async (response: string) => {
    if (!response.trim()) {
      toast.error('No content to save');
      return;
    }

    try {
      const title = `AI Study Insights - ${new Date().toLocaleDateString()}`;
      const content = response;
      
      await createNote({
        title,
        content,
        category: 'AI Study Topics',
        tags: ['AI-Generated', 'Study-Topic'],
        skipContentCheck: true
      });
      
      toast.success('Study insights saved to Notes!');
    } catch (error) {
      console.error('Error saving to notes:', error);
      toast.error('Failed to save to notes');
    }
  };

  // Create context-aware system prompt
  const createSystemPrompt = (context: ContextItem[]) => {
    if (!context.length) {
      return `You are a helpful AI study assistant. Help the user with their questions and provide clear, accurate information.`;
    }

    const contextSummary = context.map(item => 
      `${item.type.toUpperCase()}: "${item.name}"\nContent: ${item.content.slice(0, 1000)}...\n`
    ).join('\n');

    return `You are a helpful AI study assistant with access to the user's study materials. Use the following context to provide relevant and accurate answers:

AVAILABLE CONTEXT:
${contextSummary}

Instructions:
- Reference the provided materials when relevant to the user's questions
- If asked about specific content, cite which file or note you're referencing
- Help the user understand and connect concepts across their materials
- Suggest relationships between different documents when appropriate
- Provide study tips and explanations based on their content`;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Context Management Header */}
      <Card className="shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5" />
                Context-Aware AI Chat
                {currentSession && (
                  <Badge variant="outline" className="text-xs">
                    Session Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Add files and notes to give AI context about your study materials
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowContextSelector(!showContextSelector)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Context</span>
            </Button>
          </div>
        </CardHeader>
        
        {selectedContext.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Active Context:</p>
              <div className="flex flex-wrap gap-2">
                {selectedContext.map((item) => (
                  <Badge
                    key={`${item.type}-${item.id}`}
                    variant="secondary"
                    className="flex items-center gap-1 max-w-[200px]"
                  >
                    {item.type === 'file' ? (
                      <FileText className="h-3 w-3 shrink-0" />
                    ) : (
                      <Book className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">{item.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground shrink-0"
                      onClick={() => removeFromContext(item.id, item.type)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Context Selector */}
      {showContextSelector && (
        <Card className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Context Materials</CardTitle>
            <CardDescription>Choose files and notes to include in your AI conversation</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="files" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="files">Files ({availableFiles.length})</TabsTrigger>
                <TabsTrigger value="notes">Notes ({availableNotes.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="files" className="mt-4">
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {availableFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted"
                        onClick={() => addToContext(file)}
                      >
                        <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{file.summary}</p>
                        </div>
                        {selectedContext.find(c => c.id === file.id && c.type === 'file') && (
                          <Badge variant="secondary" className="text-xs shrink-0">Added</Badge>
                        )}
                      </div>
                    ))}
                    {availableFiles.length === 0 && (
                      <p className="text-center text-muted-foreground py-6">
                        No files with OCR text available. Upload and process files first.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="notes" className="mt-4">
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {availableNotes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted"
                        onClick={() => addToContext(note)}
                      >
                        <Book className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{note.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.summary}</p>
                        </div>
                        {selectedContext.find(c => c.id === note.id && c.type === 'note') && (
                          <Badge variant="secondary" className="text-xs shrink-0">Added</Badge>
                        )}
                      </div>
                    ))}
                    {availableNotes.length === 0 && (
                      <p className="text-center text-muted-foreground py-6">
                        No notes available. Create some notes first.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Latest AI Response Card - Compact */}
      {lastAIResponse && (
        <Card className="border-l-4 border-l-primary shrink-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Latest AI Response</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveToNotes(lastAIResponse)}
                className="flex items-center gap-2"
              >
                <Save className="h-3 w-3" />
                <span className="hidden sm:inline">Save to Notes</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {lastAIResponse.slice(0, 200)}...
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Chat with Context - Expandable */}
      <div className="flex-1 min-h-0">
        {!currentSession ? (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Add context materials to start chatting</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EnhancedAIChat 
            sessionId={currentSession.id}
            fileContext={selectedContext.map(item => ({
              id: item.id,
              name: item.name,
              content: item.content
            }))}
            onUserInteraction={onUserInteraction}
            createSessionWhenNeeded={createSessionWhenNeeded}
          />
        )}
      </div>
    </div>
  );
}
