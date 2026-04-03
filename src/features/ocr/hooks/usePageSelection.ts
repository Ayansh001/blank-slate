
import { useState, useEffect } from 'react';

interface PageSelectionOptions {
  pageCount: number;
}

export function usePageSelection({ pageCount }: PageSelectionOptions) {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  useEffect(() => {
    if (pageCount > 0) {
      // Select all pages by default
      setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1));
    }
  }, [pageCount]);

  const handlePageToggle = (pageNumber: number) => {
    setSelectedPages(prev => 
      prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  const handleSelectAll = () => {
    if (selectedPages.length === pageCount) {
      setSelectedPages([]);
    } else {
      setSelectedPages(Array.from({ length: pageCount }, (_, i) => i + 1));
    }
  };

  const handleSelectRange = (start: number, end: number) => {
    const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    setSelectedPages(prev => {
      const newPages = new Set([...prev, ...range]);
      return Array.from(newPages).sort((a, b) => a - b);
    });
  };

  return {
    selectedPages,
    handlePageToggle,
    handleSelectAll,
    handleSelectRange
  };
}
