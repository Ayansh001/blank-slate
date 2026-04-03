
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileStack, FileText, Loader2, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageSelectionService } from '../services/PageSelectionService';
import { useMultiPageSave } from '../hooks/useMultiPageSave';
import { parsePageMarkers } from '../utils/pageFormatUtils';
import { copyToClipboard, downloadTextFile } from '../utils/downloadUtils';

interface PageSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  fullOCRText: string;
  fileName?: string;
  defaultTitle?: string;
}

export function PageSelectionDialog({ 
  open, 
  onClose, 
  fullOCRText, 
  fileName,
  defaultTitle = 'Selected OCR Pages'
}: PageSelectionDialogProps) {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [title, setTitle] = useState(defaultTitle);
  const [category, setCategory] = useState('OCR');
  const [tags, setTags] = useState<string[]>(['ocr', 'selective']);
  const [newTag, setNewTag] = useState('');
  const [saveMode, setSaveMode] = useState<'combined' | 'individual' | 'batch'>('combined');
  
  const { saveSelectedPages, isSaving } = useMultiPageSave();

  // Parse available pages
  const availablePages = useMemo(() => parsePageMarkers(fullOCRText), [fullOCRText]);

  // Generate preview of selected content
  const selectionPreview = useMemo(() => {
    if (selectedPages.length === 0) return null;
    return PageSelectionService.extractSelectedPages(fullOCRText, selectedPages);
  }, [fullOCRText, selectedPages]);

  const handlePageToggle = (pageNumber: number) => {
    setSelectedPages(prev => 
      prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  const handleSelectAll = () => {
    if (selectedPages.length === availablePages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(availablePages.map(p => p.pageNumber));
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    if (selectedPages.length === 0) {
      toast.error('Please select at least one page');
      return;
    }

    saveSelectedPages({
      fullOCRText,
      selectedPageNumbers: selectedPages,
      title,
      category,
      tags,
      fileName,
      saveMode
    });
  };

  const handleCopySelection = async () => {
    if (!selectionPreview) return;
    
    try {
      await copyToClipboard(selectionPreview.combinedText);
      toast.success('Selected pages copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy selection');
    }
  };

  const handleDownloadSelection = async () => {
    if (!selectionPreview) return;

    try {
      await downloadTextFile({
        fileName: `selected-pages-${selectionPreview.pageRange}-${fileName || 'document'}.txt`,
        content: selectionPreview.combinedText
      });
      toast.success('Selected pages downloaded');
    } catch (error) {
      toast.error('Failed to download selection');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5" />
            Select Pages to Save
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="selection" className="space-y-4">
          <TabsList>
            <TabsTrigger value="selection">Page Selection</TabsTrigger>
            <TabsTrigger value="preview" disabled={selectedPages.length === 0}>
              Preview ({selectedPages.length} pages)
            </TabsTrigger>
            <TabsTrigger value="settings">Save Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="selection" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {availablePages.length} pages available
                </span>
                <Badge variant="secondary">
                  {selectedPages.length} selected
                </Badge>
              </div>
              <Button variant="outline" onClick={handleSelectAll} size="sm">
                {selectedPages.length === availablePages.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-60 overflow-y-auto">
              {availablePages.map((page) => (
                <Card key={page.pageNumber} className="relative">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`page-${page.pageNumber}`}
                        checked={selectedPages.includes(page.pageNumber)}
                        onCheckedChange={() => handlePageToggle(page.pageNumber)}
                      />
                      <Label htmlFor={`page-${page.pageNumber}`} className="text-sm font-medium">
                        Page {page.pageNumber}
                      </Label>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="text-xs text-muted-foreground">
                      <div>Words: {page.content.split(/\s+/).filter(word => word.length > 0).length}</div>
                      <div className="truncate" title={page.content.substring(0, 100)}>
                        {page.content.substring(0, 50)}...
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {selectionPreview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Selection Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      Pages {selectionPreview.pageRange} • {selectionPreview.totalWordCount} words • {selectionPreview.totalCharacterCount} characters
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopySelection}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadSelection}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="max-h-60 overflow-y-auto text-sm font-mono whitespace-pre-wrap bg-muted p-3 rounded">
                      {selectionPreview.combinedText.substring(0, 1000)}
                      {selectionPreview.combinedText.length > 1000 && '...'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Note Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OCR">OCR</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Academic">Academic</SelectItem>
                      <SelectItem value="Research">Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saveMode">Save Mode</Label>
                  <Select value={saveMode} onValueChange={(value: any) => setSaveMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select save mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">Combined Note</SelectItem>
                      <SelectItem value="individual">Individual Notes</SelectItem>
                      <SelectItem value="batch">Batch Save</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {saveMode === 'combined' && 'Save all selected pages as a single note'}
                    {saveMode === 'individual' && 'Save each page as a separate note'}
                    {saveMode === 'batch' && 'Save as a batch with detailed metadata'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleAddTag} size="sm">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-red-100"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedPages.length === 0}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Save {selectedPages.length > 0 ? `${selectedPages.length} Page${selectedPages.length > 1 ? 's' : ''}` : 'Selection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
