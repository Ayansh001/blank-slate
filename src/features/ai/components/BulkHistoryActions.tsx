
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Trash2, 
  Download, 
  Eye,
  CheckSquare
} from 'lucide-react';

interface BulkHistoryActionsProps {
  selectedCount: number;
  selectedIds: string[];
  onBulkDelete: (ids: string[]) => void;
  onBulkExport: (ids: string[]) => void;
  onBulkPreview: (ids: string[]) => void;
  dataType: 'quiz' | 'enhancement' | 'chat';
}

export function BulkHistoryActions({
  selectedCount,
  selectedIds,
  onBulkDelete,
  onBulkExport,
  onBulkPreview,
  dataType
}: BulkHistoryActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="mb-4 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckSquare className="h-3 w-3" />
            {selectedCount} selected
          </Badge>
          <span className="text-sm text-muted-foreground">
            Bulk actions for selected {dataType === 'quiz' ? 'quizzes' : dataType === 'enhancement' ? 'enhancements' : 'chats'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkPreview(selectedIds)}
            disabled={selectedCount === 0}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkExport(selectedIds)}
            disabled={selectedCount === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export ({selectedCount})
          </Button>
          
          <Separator orientation="vertical" className="h-6" />
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onBulkDelete(selectedIds)}
            disabled={selectedCount === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  );
}
