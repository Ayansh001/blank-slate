
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, FileText, Save, FileStack, SeparatorVertical, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useSaveToNotes } from '../hooks/useSaveToNotes';
import { SaveToNotesDialog } from './SaveToNotesDialog';
import { PageSelectionDialog } from './PageSelectionDialog';
import { parsePageMarkers, getPageStats } from '../utils/pageFormatUtils';
import { normalizeConfidence, getConfidenceColorClass } from '../utils/confidenceUtils';
import { OCRErrorBoundary } from './OCRErrorBoundary';
import { downloadTextFile, copyToClipboard } from '../utils/downloadUtils';

interface OCRTextEditorProps {
  text: string;
  confidence?: number;
  onClose: () => void;
  fileName?: string;
}

export function OCRTextEditor({ text, confidence, onClose, fileName }: OCRTextEditorProps) {
  const [editedText, setEditedText] = useState(text);
  const [selectedView, setSelectedView] = useState<'combined' | 'separated'>('separated');
  const [showPageSelection, setShowPageSelection] = useState(false);
  const { saveToNotes, isSaving, isOpen, setIsOpen } = useSaveToNotes();

  // Parse multi-page content
  const parsedPages = useMemo(() => parsePageMarkers(text), [text]);
  const pageStats = useMemo(() => getPageStats(text), [text]);
  const isMultiPage = parsedPages.length > 1;

  const handleCopyText = async () => {
    try {
      await copyToClipboard(editedText);
      toast.success('Text copied to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy text to clipboard');
    }
  };

  const handleDownloadText = async () => {
    try {
      await downloadTextFile({
        fileName: `ocr-text-${fileName || 'document'}.txt`,
        content: editedText
      });
      toast.success('Text file downloaded');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDownloadPage = async (pageNumber: number, content: string) => {
    try {
      await downloadTextFile({
        fileName: `ocr-text-${fileName || 'document'}-page-${pageNumber}.txt`,
        content
      });
      toast.success(`Page ${pageNumber} downloaded`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download page');
    }
  };

  const handleCopyPage = async (content: string, pageNumber: number) => {
    try {
      await copyToClipboard(content);
      toast.success(`Page ${pageNumber} copied to clipboard`);
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy page to clipboard');
    }
  };

  const handleSaveToNotes = (params: { title: string; category: string; tags: string[] }) => {
    saveToNotes({
      text: editedText,
      title: params.title,
      category: params.category,
      tags: params.tags
    });
  };

  const getConfidenceColor = (conf: number) => {
    return getConfidenceColorClass(conf);
  };

  const getDefaultTitle = () => {
    if (fileName) {
      return `OCR from ${fileName}`;
    }
    // Try to extract a meaningful title from the first line
    const firstLine = editedText.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 3 && firstLine.length < 50) {
      return firstLine;
    }
    return 'OCR Extracted Text';
  };

  return (
    <OCRErrorBoundary>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-full sm:max-w-4xl w-full h-full sm:h-auto sm:max-h-[90vh] m-0 sm:m-4 rounded-none sm:rounded-lg overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur-sm border-b pb-2 z-10">
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <FileText className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">OCR Text Results</span>
              {confidence !== undefined && (
                <Badge className={getConfidenceColor(confidence)}>
                  {normalizeConfidence(confidence)}% confidence
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-hidden p-1">
            {isMultiPage && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileStack className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {parsedPages.length} pages extracted
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {pageStats.pagesWithContent}/{pageStats.totalPages} with content
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedView === 'separated' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedView('separated')}
                  >
                    <SeparatorVertical className="h-4 w-4 mr-1" />
                    By Page
                  </Button>
                  <Button
                    variant={selectedView === 'combined' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedView('combined')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Combined
                  </Button>
                </div>
              </div>
            )}

            {isMultiPage && selectedView === 'separated' ? (
              <Tabs defaultValue={`page-${parsedPages[0]?.pageNumber || 1}`} className="space-y-4">
                <div className="w-full max-w-full">
                  <TabsList className="!flex !w-full !justify-start overflow-x-auto gap-1 p-1 !inline-flex-none touch-pan-x flex-nowrap" style={{scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent'}}>
                    {parsedPages.map((page) => (
                       <TabsTrigger
                         key={page.pageNumber}
                         value={`page-${page.pageNumber}`}
                         className="text-xs min-w-[80px] flex-shrink-0"
                       >
                        Page {page.pageNumber}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                
                {parsedPages.map((page) => (
                  <TabsContent key={page.pageNumber} value={`page-${page.pageNumber}`} className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Page {page.pageNumber}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPage(page.content, page.pageNumber)}
                              disabled={!page.content.trim()}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPage(page.pageNumber, page.content)}
                              disabled={!page.content.trim()}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Textarea
                          value={page.content}
                          onChange={(e) => {
                            // Update the specific page content in editedText
                            const updatedText = editedText.replace(
                              new RegExp(`=== PAGE ${page.pageNumber} ===[\\s\\S]*?=== END PAGE ${page.pageNumber} ===`),
                              `=== PAGE ${page.pageNumber} ===\n${e.target.value}\n=== END PAGE ${page.pageNumber} ===`
                            );
                            setEditedText(updatedText);
                          }}
                          className="min-h-[200px] font-mono text-xs"
                          placeholder={`No text found on page ${page.pageNumber}`}
                        />
                        <div className="text-xs text-muted-foreground">
                          <span>Words: {page.content.split(/\s+/).filter(word => word.length > 0).length}</span>
                          <span className="ml-4">Characters: {page.content.length}</span>
                          {page.content.trim().length === 0 && (
                            <span className="ml-4 text-amber-600">Empty page</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isMultiPage ? 'Combined Text (All Pages)' : 'Extracted Text'}
                </label>
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="No text was extracted from the image."
                />
                <div className="text-xs text-muted-foreground">
                  <span>Words: {editedText.split(/\s+/).filter(word => word.length > 0).length}</span>
                  <span className="ml-4">Characters: {editedText.length}</span>
                  {isMultiPage && (
                    <>
                      <span className="ml-4">Pages: {pageStats.totalPages}</span>
                      <span className="ml-4">Avg words/page: {pageStats.averageWordsPerPage}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t bg-background/95 backdrop-blur-sm sticky bottom-0 mt-4">
              <Button
                variant="outline"
                onClick={handleCopyText}
                disabled={!editedText.trim()}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadText}
                disabled={!editedText.trim()}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                disabled={!editedText.trim()}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All
              </Button>
              {isMultiPage && (
                <Button
                  variant="outline"
                  onClick={() => setShowPageSelection(true)}
                  disabled={!editedText.trim()}
                  className="w-full"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Select Pages
                </Button>
              )}
              <Button
                variant="default"
                onClick={onClose}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SaveToNotesDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSave={handleSaveToNotes}
        isSaving={isSaving}
        defaultTitle={getDefaultTitle()}
      />

      {isMultiPage && (
        <PageSelectionDialog
          open={showPageSelection}
          onClose={() => setShowPageSelection(false)}
          fullOCRText={editedText}
          fileName={fileName}
          defaultTitle={getDefaultTitle()}
        />
      )}
    </OCRErrorBoundary>
  );
}
