
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface PageGridProps {
  pageCount: number;
  selectedPages: number[];
  onPageToggle: (pageNumber: number) => void;
}

export function PageGrid({ pageCount, selectedPages, onPageToggle }: PageGridProps) {
  return (
    <ScrollArea className="h-64">
      <div className="grid grid-cols-8 gap-2">
        {Array.from({ length: pageCount }, (_, i) => {
          const pageNumber = i + 1;
          const isSelected = selectedPages.includes(pageNumber);
          
          return (
            <div
              key={pageNumber}
              className={`relative border-2 rounded p-2 cursor-pointer transition-colors ${
                isSelected 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onPageToggle(pageNumber)}
            >
              <div className="flex flex-col items-center space-y-1">
                <Checkbox
                  checked={isSelected}
                  onChange={() => onPageToggle(pageNumber)}
                  className="pointer-events-none"
                />
                <span className="text-xs font-medium">
                  Page {pageNumber}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
