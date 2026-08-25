
import { Note } from '@/types/note';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, truncateText, stripHtml } from '@/utils/noteUtils';
import { FileText, Star, Pin, MoreVertical, Copy, Trash2, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  viewMode?: 'grid' | 'list';
}

export function NoteCard({ 
  note, 
  onClick, 
  onDuplicate, 
  onDelete, 
  onToggleFavorite, 
  onTogglePin,
  onRename,
  viewMode = 'grid'
}: NoteCardProps) {
  const handleAction = (action: () => void, event: React.MouseEvent) => {
    event.stopPropagation();
    action();
  };

  const handleCopy = (event: React.MouseEvent) => {
    event.stopPropagation();
    const textContent = `${note.title}\n\n${stripHtml(note.content || '')}`;
    navigator.clipboard.writeText(textContent).then(() => {
      toast.success('Note copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy note');
    });
  };

  if (viewMode === 'list') {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 group relative">
        <CardContent className="p-4" onClick={onClick}>
          <div className="flex items-center gap-4">
            {/* Left section - Icon and status indicators */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <FileText className="h-5 w-5 text-blue-500" />
              <div className="flex items-center gap-1">
                {note.isPinned && <Pin className="h-3 w-3 text-orange-500 fill-current" />}
                {note.isFavorite && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base group-hover:text-blue-600 transition-colors truncate">
                    {note.title || 'Untitled Note'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 mt-1">
                    {truncateText(note.plainText, 120)}
                  </p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleAction(() => onRename(note.id, note.title), e)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(() => onTogglePin(note.id), e)}>
                        <Pin className="h-4 w-4 mr-2" />
                        {note.isPinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(() => onToggleFavorite(note.id), e)}>
                        <Star className="h-4 w-4 mr-2" />
                        {note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(() => onDuplicate(note.id), e)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleAction(() => onDelete(note.id), e)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Metadata row */}
              <div className="flex items-center justify-between mt-2 portrait:flex-col portrait:items-start portrait:gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {note.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {note.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{note.tags.length - 2}
                    </Badge>
                  )}
                  {note.category && (
                    <Badge variant="outline" className="text-xs">
                      {note.category}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 portrait:gap-2 portrait:text-[11px] flex-shrink-0">
                  <span className="truncate">{note.wordCount} words</span>
                  <span className="truncate">{formatDate(note.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 group relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="flex items-center gap-1 flex-shrink-0">
              {note.isPinned && <Pin className="h-4 w-4 text-orange-500 fill-current" />}
              {note.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
            </div>
          </div>
          
          {/* Copy button - visible on hover */}
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity mr-2"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleAction(() => onRename(note.id, note.title), e)}>
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleAction(() => onTogglePin(note.id), e)}>
                <Pin className="h-4 w-4 mr-2" />
                {note.isPinned ? 'Unpin' : 'Pin'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleAction(() => onToggleFavorite(note.id), e)}>
                <Star className="h-4 w-4 mr-2" />
                {note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleAction(() => onDuplicate(note.id), e)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => handleAction(() => onDelete(note.id), e)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <CardTitle 
          className="text-lg group-hover:text-blue-600 transition-colors line-clamp-2"
          onClick={onClick}
        >
          {note.title || 'Untitled Note'}
        </CardTitle>
        
        <CardDescription className="line-clamp-3" onClick={onClick}>
          {truncateText(note.plainText)}
        </CardDescription>
      </CardHeader>
      
      <CardContent onClick={onClick}>
        <div className="space-y-3">
          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{note.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              {note.category && (
                <Badge variant="outline" className="text-xs">
                  {note.category}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span>{note.wordCount} words</span>
              <span>{formatDate(note.updatedAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
