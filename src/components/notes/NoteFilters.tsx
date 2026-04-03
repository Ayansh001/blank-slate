
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, X, SortAsc, SortDesc } from 'lucide-react';
import { NoteFilters as IFilters } from '@/types/note';
import { ExpandingSearchBar } from './ExpandingSearchBar';

interface NoteFiltersProps {
  filters: IFilters;
  onFiltersChange: (filters: IFilters) => void;
  availableTags: string[];
  availableCategories: string[];
}

export function NoteFilters({ 
  filters, 
  onFiltersChange, 
  availableTags, 
  availableCategories 
}: NoteFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category: category === 'all' ? '' : category });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const handleSortChange = (sortBy: string) => {
    onFiltersChange({ ...filters, sortBy: sortBy as any });
  };

  const handleSortOrderToggle = () => {
    onFiltersChange({ 
      ...filters, 
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      category: '',
      tags: [],
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.search || filters.category || filters.tags.length > 0;

  return (
    <div className="space-y-4">
      {/* Main Search with Expanding Animation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center overflow-hidden">
            <ExpandingSearchBar
              search={filters.search}
              onSearchChange={handleSearchChange}
              onFocusChange={setIsSearchFocused}
            />
            
            {/* Controls that slide out when search is focused */}
            <div className={`
              flex items-center gap-1 xs:gap-2 transition-all duration-300 ease-out flex-wrap xs:flex-nowrap
              ${isSearchFocused 
                ? 'opacity-0 translate-x-4 pointer-events-none w-0 overflow-hidden' 
                : 'opacity-100 translate-x-0 pointer-events-auto'
              }
            `}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="shrink-0"
              >
                <Filter className="w-4 h-4 xs:mr-2" />
                <span className="hidden xs:inline">Filters</span>
              </Button>

              <div className="flex items-center gap-1 xs:gap-2 shrink-0">
                <Select value={filters.sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-32 xs:w-36 sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updatedAt">Last Modified</SelectItem>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="wordCount">Word Count</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSortOrderToggle}
                  className="shrink-0"
                >
                  {filters.sortOrder === 'asc' ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="shrink-0">
                  <X className="w-4 h-4 xs:mr-2" />
                  <span className="hidden xs:inline">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card className="animate-fade-in">
          <CardContent className="p-4 space-y-4">
            {/* Category Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {filters.search && (
            <Badge variant="secondary" className="animate-scale-in">
              Search: "{filters.search}"
              <X 
                className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive transition-colors" 
                onClick={() => handleSearchChange('')}
              />
            </Badge>
          )}
          {filters.category && (
            <Badge variant="secondary" className="animate-scale-in">
              Category: {filters.category}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive transition-colors" 
                onClick={() => handleCategoryChange('all')}
              />
            </Badge>
          )}
          {filters.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="animate-scale-in">
              Tag: {tag}
              <X 
                className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive transition-colors" 
                onClick={() => handleTagToggle(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
