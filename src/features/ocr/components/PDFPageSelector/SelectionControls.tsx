
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square } from 'lucide-react';

interface SelectionControlsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onSelectRange: (start: number, end: number) => void;
}

export function SelectionControls({ 
  selectedCount, 
  totalCount, 
  onSelectAll, 
  onSelectRange 
}: SelectionControlsProps) {
  const isAllSelected = selectedCount === totalCount;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectAll}
        className="flex items-center gap-2"
      >
        {isAllSelected ? (
          <CheckSquare className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
        {isAllSelected ? 'Deselect All' : 'Select All'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelectRange(1, Math.min(5, totalCount))}
      >
        First 5 Pages
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelectRange(Math.max(1, totalCount - 4), totalCount)}
      >
        Last 5 Pages
      </Button>

      <Badge variant="secondary">
        {selectedCount} of {totalCount} selected
      </Badge>
    </div>
  );
}
