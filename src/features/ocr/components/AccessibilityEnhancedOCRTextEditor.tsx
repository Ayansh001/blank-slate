import { useState, useMemo, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, FileText, Save, FileStack, SeparatorVertical, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useSaveToNotes } from '../hooks/useSaveToNotes';
import { SaveToNotesDialog } from './SaveToNotesDialog';
import { parsePageMarkers, getPageStats } from '../utils/pageFormatUtils';
import { normalizeConfidence, getConfidenceColorClass, isLowConfidence } from '../utils/confidenceUtils';
import { OCRErrorBoundary } from './OCRErrorBoundary';
import { downloadTextFile, copyToClipboard } from '../utils/downloadUtils';

interface OCRTextEditorProps {
  text: string;
  confidence?: number;
  onClose: () => void;
  fileName?: string;
}

/**
 * Enhanced OCR Text Editor with improved accessibility and UX
 * This is an advanced version that can be used when accessibility is a priority
 */
export function AccessibilityEnhancedOCRTextEditor({ text, confidence, onClose, fileName }: OCRTextEditorProps) {
  const [editedText, setEditedText] = useState(text);
  const [selectedView, setSelectedView] = useState<'combined' | 'separated'>('separated');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const { saveToNotes, isSaving, isOpen, setIsOpen } = useSaveToNotes();
  
  // Refs for keyboard navigation
  const tabsListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse multi-page content
  const parsedPages = useMemo(() => parsePageMarkers(text), [text]);
  const pageStats = useMemo(() => getPageStats(text), [text]);
  const isMultiPage = parsedPages.length > 1;
  
  // Confidence warnings
  const showConfidenceWarning = confidence !== undefined && isLowConfidence(confidence);

  // Keyboard navigation for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target === tabsListRef.current || tabsListRef.current?.contains(e.target as Node)) {
        if (e.key === 'ArrowLeft' && activePageIndex > 0) {
          e.preventDefault();
          setActivePageIndex(activePageIndex - 1);
        } else if (e.key === 'ArrowRight' && activePageIndex < parsedPages.length - 1) {
          e.preventDefault();
          setActivePageIndex(activePageIndex + 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activePageIndex, parsedPages.length]);

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

  const getDefaultTitle = () => {
    if (fileName) {
      return `OCR from ${fileName}`;
    }
    const firstLine = editedText.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 3 && firstLine.length < 50) {
      return firstLine;
    }
    return 'OCR Extracted Text';
  };

  return (
    <OCRErrorBoundary>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-full sm:max-w-2xl max-h-[calc(90vh-env(safe-area-inset-bottom)-2rem)] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+2rem)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
          role="dialog"
          aria-labelledby="ocr-dialog-title"
          aria-describedby="ocr-dialog-description"
        >
          <DialogHeader>
            <DialogTitle id="ocr-dialog-title" className="flex items-center gap-2">
              <FileText className="h-5 w-5" aria-hidden="true" />
              OCR Text Results
              {confidence !== undefined && (
                <Badge className={getConfidenceColorClass(confidence)}>
                  {normalizeConfidence(confidence)}% confidence
                </Badge>
              )}
            </DialogTitle>
            <div id="ocr-dialog-description" className="sr-only">
              Dialog containing OCR extracted text results with editing and export options
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Confidence Warning */}
            {showConfidenceWarning && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3" role="alert">
                <p className="text-sm text-yellow-800">
                  <strong>Low Confidence Warning:</strong> The OCR confidence is below 60%. 
                  Please review the extracted text carefully for accuracy.
                </p>
              </div>
            )}

            {isMultiPage && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileStack className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm font-medium">
                    {parsedPages.length} pages extracted
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {pageStats.pagesWithContent}/{pageStats.totalPages} with content
                  </Badge>
                </div>
                <div className="flex items-center gap-2" role="tablist" aria-label="View options">
                  <Button
                    variant={selectedView === 'separated' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedView('separated')}
                    role="tab"
                    aria-selected={selectedView === 'separated'}
                  >
                    <SeparatorVertical className="h-4 w-4 mr-1" aria-hidden="true" />
                    By Page
                  </Button>
                  <Button
                    variant={selectedView === 'combined' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedView('combined')}
                    role="tab"
                    aria-selected={selectedView === 'combined'}
                  >
                    <FileText className="h-4 w-4 mr-1" aria-hidden="true" />
                    Combined
                  </Button>
                </div>
              </div>
            )}

            {isMultiPage && selectedView === 'separated' ? (
              <Tabs value={`page-${parsedPages[activePageIndex]?.pageNumber || 1}`} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
                    disabled={activePageIndex === 0}
                    aria-label="Previous page"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="w-full max-w-full">
                    <TabsList 
                      ref={tabsListRef}
                      className="!flex !w-full !justify-start overflow-x-auto gap-1 p-1 !inline-flex-none touch-pan-x flex-nowrap"
                      style={{scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent'}}
                      role="tablist"
                      aria-label="Page navigation"
                    >
                      {parsedPages.map((page, index) => (
                        <TabsTrigger
                          key={page.pageNumber}
                          value={`page-${page.pageNumber}`}
                          className="text-xs min-w-[80px] flex-shrink-0"
                          onClick={() => setActivePageIndex(index)}
                          role="tab"
                          aria-selected={activePageIndex === index}
                        >
                          Page {page.pageNumber}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivePageIndex(Math.min(parsedPages.length - 1, activePageIndex + 1))}
                    disabled={activePageIndex === parsedPages.length - 1}
                    aria-label="Next page"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {parsedPages.map((page, index) => (
                  <TabsContent 
                    key={page.pageNumber} 
                    value={`page-${page.pageNumber}`} 
                    className="space-y-4"
                    role="tabpanel"
                    aria-labelledby={`tab-page-${page.pageNumber}`}
                  >
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
                              aria-label={`Copy page ${page.pageNumber} text`}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPage(page.pageNumber, page.content)}
                              disabled={!page.content.trim()}
                              aria-label={`Download page ${page.pageNumber} as text file`}
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
                            const updatedText = editedText.replace(
                              new RegExp(`=== PAGE ${page.pageNumber} ===[\\s\\S]*?=== END PAGE ${page.pageNumber} ===`),
                              `=== PAGE ${page.pageNumber} ===\n${e.target.value}\n=== END PAGE ${page.pageNumber} ===`
                            );
                            setEditedText(updatedText);
                          }}
                          className="min-h-[200px] font-mono text-xs"
                          placeholder={`No text found on page ${page.pageNumber}`}
                          aria-label={`Edit text for page ${page.pageNumber}`}
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
                <label htmlFor="combined-text" className="text-sm font-medium">
                  {isMultiPage ? 'Combined Text (All Pages)' : 'Extracted Text'}
                </label>
                <Textarea
                  id="combined-text"
                  ref={textareaRef}
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="No text was extracted from the image."
                  aria-describedby="text-stats"
                />
                <div id="text-stats" className="text-xs text-muted-foreground">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2" role="group" aria-label="Text actions">
              <Button
                variant="outline"
                onClick={handleCopyText}
                disabled={!editedText.trim()}
                className="w-full"
                aria-label="Copy all text to clipboard"
              >
                <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
                Copy All
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadText}
                disabled={!editedText.trim()}
                className="w-full"
                aria-label="Download all text as file"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                disabled={!editedText.trim()}
                className="w-full"
                aria-label="Save text to notes"
              >
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                Save to Notes
              </Button>
              <Button
                variant="default"
                onClick={onClose}
                className="w-full"
                aria-label="Close dialog"
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
    </OCRErrorBoundary>
  );
}