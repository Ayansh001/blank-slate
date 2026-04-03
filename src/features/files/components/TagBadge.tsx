import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface TagBadgeProps {
  tag: string;
  onRemove?: (tag: string) => Promise<void> | void;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'default';
}

export function TagBadge({ tag, onRemove, variant = 'secondary', size = 'default' }: TagBadgeProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  
  // Reset state when tag changes to prevent stale state
  useEffect(() => {
    setIsRemoving(false);
    setIsRemoved(false);
  }, [tag]);
  
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  
  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!onRemove || isRemoving || isRemoved) return;

    console.log('TagBadge: Removing tag:', tag);
    setIsRemoving(true);
    
    try {
      await onRemove(tag);
      console.log('TagBadge: Tag removed successfully:', tag);
      setIsRemoved(true);
    } catch (error) {
      console.error('TagBadge: Failed to remove tag:', tag, error);
      // On error, keep the tag visible
      setIsRemoving(false);
    }
  };

  // Don't render if removed (optimistic update)
  if (isRemoved) return null;

  return (
    <Badge 
      variant={variant} 
      className={`${sizeClass} flex items-center gap-1 max-w-fit transition-opacity ${
        isRemoving ? 'opacity-50' : ''
      }`}
    >
      <span className="truncate max-w-[100px]" title={tag}>
        {tag}
      </span>
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground rounded-full"
          onClick={handleRemove}
          disabled={isRemoving}
          title={`Remove ${tag} tag`}
        >
          {isRemoving ? (
            <Loader2 className="h-2 w-2 animate-spin" />
          ) : (
            <X className="h-2 w-2" />
          )}
        </Button>
      )}
    </Badge>
  );
}
