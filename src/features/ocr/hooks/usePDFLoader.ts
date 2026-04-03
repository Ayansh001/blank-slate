
import { useState, useEffect } from 'react';
import { pdfService } from '@/features/pdf/services/PDFService';
import { FileData } from '@/hooks/useFiles';

interface PDFLoaderOptions {
  pdfFile: File | FileData;
  isOpen: boolean;
}

export function usePDFLoader({ pdfFile, isOpen }: PDFLoaderOptions) {
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfFileObject, setPdfFileObject] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen && pdfFile) {
      setError(null);
      if (pdfFile instanceof File) {
        setPdfFileObject(pdfFile);
        loadPageCount(pdfFile);
      } else {
        convertUrlToFile().then((file) => {
          setPdfFileObject(file);
          loadPageCount(file);
        }).catch((err) => {
          console.error('Failed to convert PDF URL to file:', err);
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
          setIsLoading(false);
        });
      }
    }
  }, [isOpen, pdfFile]);

  const convertUrlToFile = async (): Promise<File> => {
    if (pdfFile && typeof pdfFile === 'object' && 'url' in pdfFile && pdfFile.url && typeof pdfFile.url === 'string') {
      setIsLoading(true);
      try {
        return await pdfService.convertUrlToFile(pdfFile.url, pdfFile.name || 'document.pdf');
      } finally {
        setIsLoading(false);
      }
    }
    throw new Error('Invalid PDF file or URL');
  };

  const loadPageCount = async (file: File) => {
    setIsLoading(true);
    try {
      const count = await pdfService.getPageCount(file);
      setPageCount(count);
    } catch (error) {
      console.error('Failed to load PDF page count:', error);
      setError(error instanceof Error ? error.message : 'Failed to load PDF page count');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    pageCount,
    isLoading,
    error,
    pdfFileObject
  };
}
