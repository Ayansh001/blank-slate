
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface ExpandingSearchBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

export function ExpandingSearchBar({ 
  search, 
  onSearchChange, 
  onFocusChange 
}: ExpandingSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    // Small delay to allow for smooth transition
    setTimeout(() => {
      setIsFocused(false);
      onFocusChange?.(false);
    }, 150);
  };

  const handleClear = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1 min-w-0">
      <div className={`
        relative transition-all duration-300 ease-out origin-left
        ${isFocused ? 'transform scale-[1.005] xs:scale-[1.01]' : 'transform scale-100'}
      `}>
        <div className="relative">
          <Search className={`
            absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground
            transition-all duration-200
            ${isFocused ? 'text-primary scale-105 xs:scale-110' : ''}
          `} />
          <Input
            ref={inputRef}
            placeholder={isFocused ? "Search your notes..." : "Search notes..."}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`
              pl-10 pr-10 transition-all duration-300 ease-out w-full
              ${isFocused ? 'ring-2 ring-primary/20 shadow-lg' : ''}
            `}
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className={`
                absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0
                opacity-0 transition-all duration-200
                ${search ? 'opacity-100' : 'opacity-0'}
                hover:bg-muted
              `}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
