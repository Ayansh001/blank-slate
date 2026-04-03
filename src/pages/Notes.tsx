import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NoteCard } from '@/components/notes/NoteCard';
import { NoteFilters } from '@/components/notes/NoteFilters';
import { TemplateSelector } from '@/components/notes/TemplateSelector';
import { RenameDialog } from '@/components/dialogs/RenameDialog';
import { useNotes } from '@/hooks/useNotes';
import { NoteFilters as IFilters } from '@/types/note';
import { FileText, Grid, List, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Notes() {
  const navigate = useNavigate();
  const { notes, isLoading, deleteNote, updateNote } = useNotes();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<IFilters>({
    search: '',
    category: '',
    tags: [],
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });
  const [renameDialog, setRenameDialog] = useState<{
    isOpen: boolean;
    noteId: string;
    currentName: string;
  }>({
    isOpen: false,
    noteId: '',
    currentName: ''
  });

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>();
    notes.forEach(note => {
      if (note.category) categorySet.add(note.category);
    });
    return Array.from(categorySet).sort();
  }, [notes]);

  const filteredAndSortedNotes = useMemo(() => {
    let filtered = notes;

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(searchTerm) ||
        note.plainText.toLowerCase().includes(searchTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(note => note.category === filters.category);
    }

    // Apply tag filters
    if (filters.tags.length > 0) {
      filtered = filtered.filter(note =>
        filters.tags.every(tag => note.tags.includes(tag))
      );
    }

    // Sort notes
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'wordCount':
          aValue = a.wordCount;
          bValue = b.wordCount;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
      }

      if (filters.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Prioritize pinned notes
    const pinned = filtered.filter(note => note.isPinned);
    const unpinned = filtered.filter(note => !note.isPinned);
    
    return [...pinned, ...unpinned];
  }, [notes, filters]);

  const handleCreateBlankNote = () => {
    navigate('/notes/edit/new');
  };

  const handleEditNote = (noteId: string) => {
    navigate(`/notes/edit/${noteId}`);
  };

  const handleDuplicateNote = (noteId: string) => {
    const originalNote = notes.find(n => n.id === noteId);
    if (originalNote) {
      navigate('/notes/edit/new', { 
        state: { 
          template: {
            title: `${originalNote.title} (Copy)`,
            content: originalNote.content,
            category: originalNote.category,
            tags: originalNote.tags
          }
        }
      });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(noteId);
    }
  };

  const handleToggleFavorite = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      updateNote({ ...note, isFavorite: !note.isFavorite });
    }
  };

  const handleTogglePin = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      updateNote({ ...note, isPinned: !note.isPinned });
    }
  };

  const handleRenameNote = (noteId: string, currentName: string) => {
    setRenameDialog({
      isOpen: true,
      noteId,
      currentName
    });
  };

  const handleRenameSubmit = async (newName: string) => {
    const note = notes.find(n => n.id === renameDialog.noteId);
    if (note) {
      try {
        await updateNote({ ...note, title: newName });
        toast.success('Note renamed successfully');
        setRenameDialog({ isOpen: false, noteId: '', currentName: '' });
      } catch (error) {
        toast.error('Failed to rename note');
      }
    }
  };

  const stats = {
    total: notes.length,
    favorites: notes.filter(n => n.isFavorite).length,
    pinned: notes.filter(n => n.isPinned).length,
    totalWords: notes.reduce((sum, note) => sum + note.wordCount, 0)
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Notes</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Organize and manage your study notes
          </p>
        </div>
        
        <div className="flex items-center gap-1 xs:gap-2 flex-wrap xs:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="shrink-0"
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateBlankNote}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 xs:mr-2" />
            <span className="hidden xs:inline">Quick Note</span>
          </Button>
          <TemplateSelector onCreateBlank={handleCreateBlankNote} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-slate-600">Total Notes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.favorites}</div>
            <div className="text-sm text-slate-600">Favorites</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pinned}</div>
            <div className="text-sm text-slate-600">Pinned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalWords}</div>
            <div className="text-sm text-slate-600">Total Words</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <NoteFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableTags={availableTags}
        availableCategories={availableCategories}
      />

      {/* Notes Grid/List */}
      {filteredAndSortedNotes.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {filteredAndSortedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={() => handleEditNote(note.id)}
              onDuplicate={handleDuplicateNote}
              onDelete={handleDeleteNote}
              onToggleFavorite={handleToggleFavorite}
              onTogglePin={handleTogglePin}
              onRename={handleRenameNote}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl mb-2">
              {notes.length === 0 ? 'No notes yet' : 'No notes match your filters'}
            </h3>
            <p className="text-slate-600 mb-4">
              {notes.length === 0 
                ? 'Create your first note to get started with your study journey'
                : 'Try adjusting your search criteria or clear the filters'
              }
            </p>
            {notes.length === 0 && (
              <div className="flex gap-2 justify-center">
                <Button onClick={handleCreateBlankNote} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Note
                </Button>
                <TemplateSelector onCreateBlank={handleCreateBlankNote} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rename Dialog */}
      <RenameDialog
        isOpen={renameDialog.isOpen}
        onClose={() => setRenameDialog({ isOpen: false, noteId: '', currentName: '' })}
        onRename={handleRenameSubmit}
        currentName={renameDialog.currentName}
        title="Rename Note"
        description="Enter a new name for this note."
      />
    </div>
  );
}
