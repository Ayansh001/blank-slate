import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { pdfTextExtractor, PDFTextContent, PDFSearchResult } from '../services/PDFTextExtractor';
import { toast } from 'sonner';

export function usePDFText() {
  const [extractedText, setExtractedText] = useState<PDFTextContent[]>([]);
  const [searchResults, setSearchResults] = useState<PDFSearchResult[]>([]);

  const extractTextMutation = useMutation({
    mutationFn: async (pdfUrl: string) => {
      return await pdfTextExtractor.extractAllText(pdfUrl);
    },
    onSuccess: (data) => {
      setExtractedText(data);
      const totalText = data.reduce((acc, page) => acc + page.text.length, 0);
      toast.success(`Extracted ${totalText} characters from PDF`);
    },
    onError: (error) => {
      console.error('PDF text extraction failed:', error);
      toast.error('Failed to extract text from PDF');
    }
  });

  const searchInPDFMutation = useMutation({
    mutationFn: async ({ pdfUrl, searchTerm }: { pdfUrl: string; searchTerm: string }) => {
      return await pdfTextExtractor.searchInPDF(pdfUrl, searchTerm);
    },
    onSuccess: (data) => {
      setSearchResults(data);
      toast.success(`Found ${data.length} matches`);
    },
    onError: (error) => {
      console.error('PDF search failed:', error);
      toast.error('Failed to search in PDF');
    }
  });

  const extractText = useCallback((pdfUrl: string) => {
    extractTextMutation.mutate(pdfUrl);
  }, [extractTextMutation]);

  const searchInPDF = useCallback((pdfUrl: string, searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    searchInPDFMutation.mutate({ pdfUrl, searchTerm });
  }, [searchInPDFMutation]);

  const clearResults = useCallback(() => {
    setExtractedText([]);
    setSearchResults([]);
  }, []);

  return {
    extractedText,
    searchResults,
    extractText,
    searchInPDF,
    clearResults,
    isExtracting: extractTextMutation.isPending,
    isSearching: searchInPDFMutation.isPending
  };
}