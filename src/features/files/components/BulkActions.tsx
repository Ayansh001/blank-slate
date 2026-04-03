
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface BulkActionsProps {
  selectedCount: number;
  onBulkTag: () => void;
  onBulkMove: () => void;
  onBulkDelete: () => void;
}

export function BulkActions({ 
  selectedCount, 
  onBulkTag, 
  onBulkMove, 
  onBulkDelete 
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{selectedCount} files selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onBulkTag}>
              Bulk Tag
            </Button>
            <Button variant="outline" size="sm" onClick={onBulkMove}>
              Move to Folder
            </Button>
            <Button variant="destructive" size="sm" onClick={onBulkDelete}>
              Delete Selected
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
