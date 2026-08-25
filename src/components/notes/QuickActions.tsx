
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotes } from '@/hooks/useNotes';
import { toast } from 'sonner';

export function QuickActions() {
  const navigate = useNavigate();
  const { notes } = useNotes();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + N for new note
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        navigate('/notes/edit/new');
        toast.success('Creating new note...');
      }

      // Ctrl/Cmd + K for search (future feature)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // Focus search input when implemented
        const searchInput = document.querySelector('[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          toast.info('Search notes...');
        }
      }

      // Ctrl/Cmd + / for help
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        toast.info('Keyboard shortcuts: Ctrl+N (New note), Ctrl+K (Search), Ctrl+/ (Help)');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null; // This component only handles keyboard events
}
