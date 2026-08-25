
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { X } from 'lucide-react';

export interface FilterOptions {
  dateRange?: DateRange;
  types: string[];
  statuses: string[];
  searchTerm: string;
}

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

export function FilterDialog({ 
  open, 
  onOpenChange, 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: FilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters = { dateRange: undefined, types: [], statuses: [], searchTerm: '' };
    setLocalFilters(clearedFilters);
    onClearFilters();
    onOpenChange(false);
  };

  const typeOptions = [
    { value: 'quiz', label: 'Quiz Sessions' },
    { value: 'enhancement', label: 'Note Enhancements' },
    { value: 'file_enhancement', label: 'File Enhancements' },
    { value: 'chat', label: 'Chat Sessions' }
  ];

  const statusOptions = [
    { value: 'completed', label: 'Completed' },
    { value: 'applied', label: 'Applied' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' }
  ];

  const hasActiveFilters = filters.types.length > 0 || filters.statuses.length > 0 || filters.dateRange || filters.searchTerm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Filter AI History
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {filters.types.length + filters.statuses.length + (filters.dateRange ? 1 : 0) + (filters.searchTerm ? 1 : 0)} active
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Filter your AI interactions by date, type, and status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <DatePickerWithRange
              date={localFilters.dateRange}
              onDateChange={(dateRange) => 
                setLocalFilters(prev => ({ ...prev, dateRange }))
              }
            />
          </div>

          {/* Types */}
          <div className="space-y-2">
            <Label>Activity Types</Label>
            <div className="space-y-2">
              {typeOptions.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.value}
                    checked={localFilters.types.includes(type.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setLocalFilters(prev => ({
                          ...prev,
                          types: [...prev.types, type.value]
                        }));
                      } else {
                        setLocalFilters(prev => ({
                          ...prev,
                          types: prev.types.filter(t => t !== type.value)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={type.value} className="text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Statuses */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={status.value}
                    checked={localFilters.statuses.includes(status.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setLocalFilters(prev => ({
                          ...prev,
                          statuses: [...prev.statuses, status.value]
                        }));
                      } else {
                        setLocalFilters(prev => ({
                          ...prev,
                          statuses: prev.statuses.filter(s => s !== status.value)
                        }));
                      }
                    }}
                  />
                  <Label htmlFor={status.value} className="text-sm">
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
