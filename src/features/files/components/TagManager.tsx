
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTags: (tags: string[]) => void;
}

export function TagManager({ isOpen, onClose, onAddTags }: TagManagerProps) {
  const [tagInput, setTagInput] = useState('');

  if (!isOpen) return null;

  const handleAddTags = () => {
    if (tagInput.trim()) {
      const tags = tagInput.split(',').map(tag => tag.trim()).filter(Boolean);
      onAddTags(tags);
      setTagInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Add Tags</h3>
          <Input
            placeholder="Enter tags separated by commas"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTags()}
            autoFocus
          />
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAddTags}>
              Add Tags
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
