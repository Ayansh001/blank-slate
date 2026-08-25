
import { Card, CardContent } from '@/components/ui/card';
import { FolderTree } from './FolderTree';

interface FileFiltersProps {
  currentFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  categories: string[];
  allTags: string[];
  selectedCategory: string;
  selectedTags: string[];
  onCategoryChange: (category: string) => void;
  onTagsChange: (tags: string[]) => void;
}

export function FileFilters({
  currentFolderId,
  onFolderSelect,
  categories,
  allTags,
  selectedCategory,
  selectedTags,
  onCategoryChange,
  onTagsChange
}: FileFiltersProps) {
  return (
    <div className="space-y-4">
      <FolderTree
        currentFolderId={currentFolderId || undefined}
        onFolderSelect={onFolderSelect}
      />

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">Filters</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full mt-1 p-2 border rounded text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {allTags.length > 0 && (
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                  {allTags.map(tag => (
                    <label key={tag} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onTagsChange([...selectedTags, tag]);
                          } else {
                            onTagsChange(selectedTags.filter(t => t !== tag));
                          }
                        }}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
