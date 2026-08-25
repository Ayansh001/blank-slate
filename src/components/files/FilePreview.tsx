
import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Download, X, ZoomIn, ZoomOut, RotateCw, AlertCircle } from 'lucide-react';
import { FileData } from '@/hooks/useFiles';
import { PDFViewer } from '@/features/files/components/PDFViewer';

interface FilePreviewProps {
  file: FileData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreview({ file, isOpen, onClose }: FilePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!file) return null;

  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setImageError(false);
  };

  const renderPreview = () => {
    if (!file.url) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-100 rounded-lg p-8">
          <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">File Not Available</h3>
            <p className="text-slate-600 mb-4">The file URL could not be generated. Please try refreshing the page.</p>
          </div>
        </div>
      );
    }

    if (file.file_type.startsWith('image/') && !imageError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-100 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              Reset
            </Button>
          </div>
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-[500px] object-contain"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-in-out'
            }}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (file.file_type === 'application/pdf') {
      return (
        <div className="space-y-4">
          <PDFViewer url={file.url} fileName={file.name} />
        </div>
      );
    }

    if (file.file_type.startsWith('text/')) {
      return (
        <div className="bg-slate-100 rounded-lg p-4 min-h-[400px]">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Text File Preview</h3>
            <p className="text-slate-600 mb-4">Download to view the full content</p>
            <Button onClick={handleDownload} disabled={!file.url}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-100 rounded-lg p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">File Preview</h3>
          <p className="text-slate-600 mb-4">Preview not available for this file type</p>
          <Button onClick={handleDownload} disabled={!file.url}>
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-auto"
          )}
        >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium truncate pr-4">
              {file.name}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!file.url}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            {file.file_type} • {Math.round(file.file_size / 1024)} KB
          </div>
        </DialogHeader>
          {renderPreview()}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
