
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { pdfService } from '@/features/pdf/services/PDFService';
import * as pdfjsLib from 'pdfjs-dist';

interface PDFViewerProps {
  url: string;
  fileName: string;
}

export function PDFViewer({ url, fileName }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Loading PDF from URL:', url);
        const pdf = await pdfService.loadDocument(url);
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
        
        // Render the first page after loading
        if (pdf.numPages > 0) {
          await renderPage(1);
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
        setError(error instanceof Error ? error.message : 'Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    if (url) {
      loadPDF();
    }

    return () => {
      // Cleanup on unmount
      if (pdfDocRef.current) {
        pdfDocRef.current = null;
      }
    };
  }, [url]);

  const renderPage = async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current) {
      console.warn('PDF document or canvas not available for rendering');
      return;
    }

    try {
      console.log(`Rendering page ${pageNumber} of ${numPages}`);
      const page = await pdfDocRef.current.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas 2D context');
      }

      const viewport = page.getViewport({ scale, rotation });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear the canvas before rendering
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      console.log(`Successfully rendered page ${pageNumber}`);
    } catch (error) {
      console.error(`Error rendering page ${pageNumber}:`, error);
      setError(`Failed to render page ${pageNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (!isLoading && pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, rotation, isLoading]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <FileText className="h-6 w-6 animate-pulse" />
            <div className="animate-pulse">Loading PDF...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>PDF Loading Error:</strong> {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button variant="outline" asChild>
              <a href={url} download={fileName}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* PDF Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm">
                Page {currentPage} of {numPages}
              </span>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-sm min-w-16 text-center">
                {Math.round(scale * 100)}%
              </span>
              
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={rotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" asChild>
                <a href={url} download={fileName}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Canvas */}
      <Card>
        <CardContent className="p-4">
          <div className="overflow-auto max-h-[600px] flex justify-center">
            <canvas 
              ref={canvasRef}
              className="border shadow-sm max-w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
