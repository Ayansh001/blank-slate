import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MessageSquare, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  History
} from 'lucide-react';
import { AIChatSession } from '../types';

interface ChatSessionDrawerProps {
  sessions: AIChatSession[];
  currentSession: AIChatSession | null;
  onSessionSelect: (session: AIChatSession) => void;
  onCreateSession: () => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function ChatSessionDrawer({
  sessions,
  currentSession,
  onSessionSelect,
  onCreateSession,
  onRenameSession,
  onDeleteSession
}: ChatSessionDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteSession, setDeleteSession] = useState<string | null>(null);

  const handleStartEdit = (session: AIChatSession) => {
    setEditingSession(session.id);
    setEditName(session.session_name || '');
  };

  const handleSaveEdit = () => {
    if (editingSession && editName.trim()) {
      onRenameSession(editingSession, editName.trim());
      setEditingSession(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
    setEditName('');
  };

  const handleDeleteConfirm = () => {
    if (deleteSession) {
      onDeleteSession(deleteSession);
      setDeleteSession(null);
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Chat History ({sessions.length})
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle>Chat Sessions</DrawerTitle>
                <DrawerDescription>
                  Manage your AI chat conversations
                </DrawerDescription>
              </div>
              <Button onClick={onCreateSession} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
          </DrawerHeader>
          
          <ScrollArea className="px-4 pb-4 max-h-[50vh]">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    currentSession?.id === session.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => {
                        onSessionSelect(session);
                        setIsOpen(false);
                      }}
                    >
                      {editingSession === session.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-6 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-sm truncate">
                            {session.session_name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {session.ai_service}
                            </Badge>
                            <span className="text-xs opacity-70">
                              {session.total_messages} messages
                            </span>
                            <span className="text-xs opacity-70">
                              {new Date(session.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingSession !== session.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(session);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No chat sessions yet</p>
                  <p className="text-sm">Start a new conversation to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!deleteSession} onOpenChange={() => setDeleteSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}