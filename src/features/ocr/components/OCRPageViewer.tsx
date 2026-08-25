import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface OCRPageData {
  pageNumber: number;
  content: string;
  confidence?: number;
}

interface OCRPageViewerProps {
  pages: OCRPageData[];
  fileName?: string;
  onPageEdit?: (pageNumber: number, content: string) => void;
}

export function OCRPageViewer({ pages, fileName, onPageEdit }: OCRPageViewerProps) {
  const [editingPage, setEditingPage] = useState<number | null>(null);

  const handleCopyPage = (content: string, pageNumber: number) => {
    navigator.clipboard.writeText(content);
    toast.success(`Page ${pageNumber} copied to clipboard`);
  };

  const handleDownloadPage = (pageNumber: number, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'document'}-page-${pageNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Page ${pageNumber} downloaded`);
  };

  const getConfidenceColor = (confidence: number | undefined) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-4">
      {pages.map((page) => (
        <Card key={page.pageNumber} className="relative">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Page {page.pageNumber}</span>
                {page.confidence !== undefined && (
                  <Badge className={getConfidenceColor(page.confidence)}>
                    {Math.round(page.confidence)}% confidence
                  </Badge>
                )}
              </div>
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
          <CardContent className="space-y-3">
            {editingPage === page.pageNumber ? (
              <div className="space-y-2">
                <Textarea
                  value={page.content}
                  onChange={(e) => onPageEdit?.(page.pageNumber, e.target.value)}
                  className="min-h-[150px] font-mono text-xs"
                  placeholder={`No text found on page ${page.pageNumber}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setEditingPage(null)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div 
                  className="p-3 bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => setEditingPage(page.pageNumber)}
                >
                  <pre className="font-mono text-xs whitespace-pre-wrap text-muted-foreground max-h-32 overflow-y-auto">
                    {page.content || `[No text found on page ${page.pageNumber}]`}
                  </pre>
                </div>
                <div className="text-xs text-muted-foreground flex justify-between">
                  <div>
                    <span>Words: {page.content.split(/\s+/).filter(word => word.length > 0).length}</span>
                    <span className="ml-4">Characters: {page.content.length}</span>
                  </div>
                  <span className="text-muted-foreground/70">Click to edit</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}