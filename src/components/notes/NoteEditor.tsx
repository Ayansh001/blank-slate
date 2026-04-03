import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from './RichTextEditor';
import { AIErrorBoundary } from '@/features/ai/components/AIErrorBoundary';
import { NoteSummaryModule } from '@/features/ai/modules/NoteSummaryModule';
import { NoteKeyPointsModule } from '@/features/ai/modules/NoteKeyPointsModule';
import { NoteQuestionsModule } from '@/features/ai/modules/NoteQuestionsModule';
import { ProviderSwitcher } from '@/features/ai/components/ProviderSwitcher';
import { useNotes } from '@/hooks/useNotes';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { exportToMarkdown, exportToPDF, stripHtml } from '@/utils/noteUtils';
import { Note } from '@/types/note';
import { Save, ArrowLeft, Star, Pin, Copy, Trash2, Loader2, FileText, Sparkles, Download, MoreHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateData {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export function NoteEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { notes, createNote, updateNote, deleteNote, isUpdating, isCreating } = useNotes();
  
  const [note, setNote] = useState<Partial<Note>>({
    title: '',
    content: '',
    tags: [],
    category: '',
    isPinned: false,
    isFavorite: false
  });
  
  const [newTag, setNewTag] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDraft, setIsDraft] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const existingNote = notes.find(n => n.id === id);
  const isNewNote = id === 'new';
  const templateData = location.state?.template as TemplateData;

  // Enhanced logic to determine if note has meaningful content for saving
  const hasContent = useCallback(() => {
    const hasTitle = note.title && note.title.trim().length > 0;
    const hasBodyContent = note.content && stripHtml(note.content).trim().length > 0;
    return hasTitle || hasBodyContent;
  }, [note.title, note.content]);

  const hasMeaningfulContent = useCallback(() => {
    const plainText = stripHtml(note.content || '').trim();
    const hasCustomTitle = note.title && note.title.trim() !== '' && note.title.trim() !== 'Untitled Note';
    const hasEnoughText = plainText.length >= 50; // Reduced from 100 to 50
    
    return hasCustomTitle || hasEnoughText;
  }, [note.title, note.content]);

  // Check if note is ready for database save (requires custom title OR explicit user action)
  const isReadyForDatabaseSave = useCallback(() => {
    const hasCustomTitle = note.title && note.title.trim() !== '' && note.title.trim() !== 'Untitled Note';
    return hasCustomTitle && hasMeaningfulContent();
  }, [note.title, hasMeaningfulContent]);

  // Draft management functions
  const loadDraft = useCallback(() => {
    const draftKey = isNewNote ? 'note-draft-new' : `note-draft-${id}`;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        if (isNewNote || !existingNote || draftData.timestamp > new Date(existingNote.updatedAt).getTime()) {
          return draftData;
        }
      } catch (error) {
        console.error('Failed to parse draft:', error);
      }
    }
    return null;
  }, [isNewNote, id, existingNote]);

  const saveDraft = useCallback(() => {
    if (hasContent()) {
      const draftKey = isNewNote ? 'note-draft-new' : `note-draft-${id}`;
      localStorage.setItem(draftKey, JSON.stringify({
        title: note.title,
        content: note.content,
        category: note.category,
        tags: note.tags,
        timestamp: Date.now()
      }));
    }
  }, [note, isNewNote, id, hasContent]);

  const clearDraft = useCallback(() => {
    const draftKey = isNewNote ? 'note-draft-new' : `note-draft-${id}`;
    localStorage.removeItem(draftKey);
  }, [isNewNote, id]);

  const saveNote = useCallback(async () => {
    if (!hasContent()) return;
    
    try {
      if (isNewNote) {
        // For new notes, require meaningful content
        if (!hasMeaningfulContent()) {
          toast.warning('Please add more content or a custom title before saving');
          return;
        }
        
        const newNoteData = {
          title: note.title || 'Untitled Note',
          content: note.content || '',
          tags: note.tags || [],
          category: note.category || '',
          isPinned: note.isPinned || false,
          isFavorite: note.isFavorite || false
        };
        
        createNote(newNoteData);
        setIsDraft(false);
        setHasChanges(false);
        clearDraft();
      } else if (existingNote) {
        // Update existing note
        updateNote({
          ...existingNote,
          ...note,
          title: note.title || 'Untitled Note',
          content: note.content || '',
          tags: note.tags || [],
          category: note.category || '',
          isPinned: note.isPinned || false,
          isFavorite: note.isFavorite || false
        } as Note);
        setHasChanges(false);
        clearDraft();
      }
      setLastSaved(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }, [note, isNewNote, existingNote, createNote, updateNote, hasContent, hasMeaningfulContent, clearDraft]);

  // Navigation guard setup
  const { guardNavigation } = useNavigationGuard({
    hasUnsavedChanges: hasChanges && hasContent(),
    onConfirmSave: saveNote,
    onDiscard: clearDraft
  });

  // Initialize note data
  useEffect(() => {
    if (isNewNote) {
      const draft = loadDraft();
      
      if (draft) {
        setNote({
          title: draft.title || '',
          content: draft.content || '',
          category: draft.category || '',
          tags: draft.tags || [],
          isPinned: false,
          isFavorite: false
        });
        toast.info('Draft recovered from previous session');
      } else if (templateData) {
        setNote({
          title: templateData.title || '',
          content: templateData.content || '',
          category: templateData.category || '',
          tags: templateData.tags || [],
          isPinned: false,
          isFavorite: false
        });
      }
      setIsDraft(true);
      setIsLoading(false);
    } else if (existingNote) {
      setNote(existingNote);
      setIsDraft(false);
      setIsLoading(false);
    } else {
      navigate('/notes');
    }
  }, [id, existingNote, navigate, isNewNote, templateData, loadDraft]);

  // MODIFIED: Only draft auto-save (no database auto-save)
  useEffect(() => {
    if (!isLoading && hasContent() && hasChanges) {
      // Save draft to localStorage only
      const draftTimer = setTimeout(() => {
        saveDraft();
      }, 1000);

      return () => {
        clearTimeout(draftTimer);
      };
    }
  }, [note.title, note.content, saveDraft, isLoading, hasContent, hasChanges]);

  // Track changes
  useEffect(() => {
    if (!isLoading && existingNote) {
      const hasActualChanges = 
        existingNote.title !== (note.title || '') ||
        existingNote.content !== (note.content || '') ||
        JSON.stringify(existingNote.tags || []) !== JSON.stringify(note.tags || []) ||
        existingNote.category !== (note.category || '') ||
        existingNote.isPinned !== (note.isPinned || false) ||
        existingNote.isFavorite !== (note.isFavorite || false);
      
      setHasChanges(hasActualChanges);
    } else if (!isLoading && isNewNote && hasContent()) {
      setHasChanges(true);
    }
  }, [note.title, note.content, note.tags, note.category, note.isPinned, note.isFavorite, isLoading, existingNote, isNewNote, hasContent]);

  // Handle navigation with guard
  const handleBackToNotes = useCallback(() => {
    guardNavigation(() => navigate('/notes'));
  }, [guardNavigation, navigate]);

  const handleAddTag = () => {
    if (newTag.trim() && !note.tags?.includes(newTag.trim())) {
      setNote(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNote(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleDuplicate = () => {
    if (note) {
      navigate('/notes/edit/new', { 
        state: { 
          template: {
            title: `${note.title} (Copy)`,
            content: note.content,
            category: note.category,
            tags: note.tags
          }
        }
      });
    }
  };

  const handleDelete = () => {
    if (existingNote && window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(existingNote.id);
      navigate('/notes');
    }
  };

  const handleExport = (format: 'markdown' | 'pdf' | 'plain') => {
    const title = note.title || 'Untitled Note';
    const content = note.content || '';
    
    switch (format) {
      case 'markdown':
        const markdown = exportToMarkdown(title, content);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.md`;
        a.click();
        break;
      case 'pdf':
        exportToPDF(title, content);
        break;
      case 'plain':
        const plainText = stripHtml(content);
        const textBlob = new Blob([`${title}\n\n${plainText}`], { type: 'text/plain' });
        const textUrl = URL.createObjectURL(textBlob);
        const textLink = document.createElement('a');
        textLink.href = textUrl;
        textLink.download = `${title}.txt`;
        textLink.click();
        break;
    }
  };

  const handleManualSave = () => {
    saveNote();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with responsive layout */}
      <div className="space-y-3 xs:space-y-0 xs:flex xs:flex-nowrap xs:items-center xs:justify-between xs:gap-4">
        <div className="flex items-center gap-2 xs:gap-4 flex-1 min-w-0">
          <Button variant="outline" size="sm" onClick={handleBackToNotes} className="shrink-0">
            <ArrowLeft className="h-4 w-4 xs:mr-2" />
            <span className="hidden xs:inline">Back to Notes</span>
          </Button>
          <div className="flex items-center gap-1 xs:gap-2 text-sm text-muted-foreground min-w-0 overflow-hidden">
            {isDraft && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 shrink-0 text-xs">
                <FileText className="h-3 w-3 xs:mr-1" />
                <span className="hidden sm:inline">Draft</span>
              </Badge>
            )}
            {lastSaved && !isDraft && (
              <span className="truncate hidden sm:inline text-xs">Last saved: {lastSaved}</span>
            )}
            {(isUpdating || isCreating) && (
              <span className="flex items-center gap-1 shrink-0 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden xs:inline">Saving...</span>
              </span>
            )}
            {hasChanges && !isUpdating && !isCreating && (
              <span className="text-amber-600 shrink-0 hidden xs:inline text-xs">Unsaved changes</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 xs:gap-2 shrink-0 flex-wrap xs:flex-nowrap">
          {/* Primary actions - always visible */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNote(prev => ({ ...prev, isPinned: !prev.isPinned }))}
            className="shrink-0"
          >
            <Pin className={`h-4 w-4 ${note.isPinned ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setNote(prev => ({ ...prev, isFavorite: !prev.isFavorite }))}
            className="shrink-0"
          >
            <Star className={`h-4 w-4 ${note.isFavorite ? 'fill-current text-yellow-500' : ''}`} />
          </Button>
          
          {/* Secondary actions - hidden on mobile, moved to overflow menu */}
          <div className="hidden md:flex items-center gap-1 xs:gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate} className="shrink-0">
              <Copy className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Duplicate</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const textContent = `${note.title || 'Untitled Note'}\n\n${stripHtml(note.content || '')}`;
                navigator.clipboard.writeText(textContent).then(() => {
                  toast.success('Note copied to clipboard');
                }).catch(() => {
                  toast.error('Failed to copy note');
                });
              }}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Copy Text</span>
            </Button>
            {!isNewNote && (
              <Button variant="outline" size="sm" onClick={handleDelete} className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Select onValueChange={(value) => handleExport(value as any)}>
              <SelectTrigger className="w-24 lg:w-32 shrink-0">
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="plain">Plain Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Mobile overflow menu for secondary actions */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const textContent = `${note.title || 'Untitled Note'}\n\n${stripHtml(note.content || '')}`;
                  navigator.clipboard.writeText(textContent).then(() => {
                    toast.success('Note copied to clipboard');
                  }).catch(() => {
                    toast.error('Failed to copy note');
                  });
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('markdown')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('plain')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as Text
                </DropdownMenuItem>
                {!isNewNote && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Note
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Save button - always visible */}
          <Button onClick={handleManualSave} disabled={isUpdating || isCreating || !hasContent()} className="shrink-0">
            {(isUpdating || isCreating) ? <Loader2 className="h-4 w-4 xs:mr-2 animate-spin" /> : <Save className="h-4 w-4 xs:mr-2" />}
            <span className="hidden xs:inline">Save</span>
          </Button>
        </div>
      </div>

      {/* Note Details */}
      <Card>
        <CardHeader>
          <Input
            placeholder="Note title..."
            value={note.title || ''}
            onChange={(e) => setNote(prev => ({ ...prev, title: e.target.value }))}
            className="text-2xl font-bold border-none p-0 focus-visible:ring-0"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metadata */}
          <div className="flex flex-col xs:flex-row gap-3 xs:gap-4">
            <Select
              value={note.category || ''}
              onValueChange={(value) => setNote(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="w-full xs:w-44 sm:w-48">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Work">Work</SelectItem>
                <SelectItem value="Academic">Academic</SelectItem>
                <SelectItem value="Research">Research</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 flex-1 xs:flex-initial">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 xs:w-24 sm:w-28 md:w-32"
              />
              <Button variant="outline" size="sm" onClick={handleAddTag} className="shrink-0">
                Add
              </Button>
            </div>
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-red-100"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="p-6">
          <RichTextEditor
            value={note.content || ''}
            onChange={(content) => setNote(prev => ({ ...prev, content }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
