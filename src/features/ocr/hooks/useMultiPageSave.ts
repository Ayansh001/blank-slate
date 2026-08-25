
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNotes } from '@/hooks/useNotes';
import { toast } from 'sonner';
import { PageSelectionService, PageSelectionResult } from '../services/PageSelectionService';

export interface MultiPageSaveParams {
  fullOCRText: string;
  selectedPageNumbers: number[];
  title?: string;
  category?: string;
  tags?: string[];
  fileName?: string;
  saveMode: 'combined' | 'individual' | 'batch';
}

export interface IndividualPageSaveParams {
  fullOCRText: string;
  pageNumber: number;
  title?: string;
  category?: string;
  tags?: string[];
  fileName?: string;
}

export function useMultiPageSave() {
  const { createNote } = useNotes();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const saveSelectedPagesMutation = useMutation({
    mutationFn: async (params: MultiPageSaveParams) => {
      const { fullOCRText, selectedPageNumbers, title, category, tags, fileName, saveMode } = params;

      console.log('Saving selected pages:', { selectedPageNumbers, saveMode });

      // Validate selection
      const validation = PageSelectionService.validatePageSelection(fullOCRText, selectedPageNumbers);
      if (!validation.valid) {
        throw new Error(`Invalid pages selected: ${validation.invalidPages.join(', ')}`);
      }

      // Extract selected pages
      const cacheKey = fileName || `ocr-${Date.now()}`;
      const selectionResult = PageSelectionService.extractSelectedPages(
        fullOCRText, 
        selectedPageNumbers, 
        cacheKey
      );

      if (saveMode === 'combined') {
        return await saveCombinedPages(selectionResult, title, category, tags, fileName);
      } else if (saveMode === 'individual') {
        return await saveIndividualPages(selectionResult, title, category, tags, fileName);
      } else if (saveMode === 'batch') {
        return await saveBatchPages(selectionResult, title, category, tags, fileName);
      }
    },
    onSuccess: (result, variables) => {
      const pageCount = variables.selectedPageNumbers.length;
      const mode = variables.saveMode;
      
      if (mode === 'individual') {
        toast.success(`${pageCount} pages saved as individual notes`);
      } else if (mode === 'combined') {
        toast.success(`Selected pages saved as combined note`);
      } else {
        toast.success(`${pageCount} pages saved successfully`);
      }
      
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error('Multi-page save error:', error);
      toast.error('Failed to save selected pages: ' + error.message);
    }
  });

  const saveIndividualPageMutation = useMutation({
    mutationFn: async (params: IndividualPageSaveParams) => {
      const selectionResult = PageSelectionService.extractSelectedPages(
        params.fullOCRText,
        [params.pageNumber],
        `single-page-${params.pageNumber}`
      );

      if (selectionResult.selectedPages.length === 0) {
        throw new Error(`Page ${params.pageNumber} not found`);
      }

      const page = selectionResult.selectedPages[0];
      const content = generateSinglePageNoteContent(page, params.fileName, selectionResult.originalDocumentStats);

      createNote({
        title: params.title || `OCR Page ${params.pageNumber}${params.fileName ? ` from ${params.fileName}` : ''}`,
        content,
        category: params.category || 'OCR',
        tags: [...(params.tags || []), 'ocr', 'single-page', `page-${params.pageNumber}`],
        skipContentCheck: true
      });

      return { savedCount: 1, pageNumber: params.pageNumber };
    },
    onSuccess: (result) => {
      toast.success(`Page ${result.pageNumber} saved to notes`);
    },
    onError: (error) => {
      console.error('Individual page save error:', error);
      toast.error('Failed to save page: ' + error.message);
    }
  });

  // Helper functions for different save modes
  const saveCombinedPages = async (
    selectionResult: PageSelectionResult, 
    title?: string, 
    category?: string, 
    tags?: string[], 
    fileName?: string
  ) => {
    const content = generateCombinedPagesNoteContent(selectionResult, fileName);
    
    createNote({
      title: title || `OCR Pages ${selectionResult.pageRange}${fileName ? ` from ${fileName}` : ''}`,
      content,
      category: category || 'OCR',
      tags: [...(tags || []), 'ocr', 'multi-page', 'selective-save'],
      skipContentCheck: true
    });

    return { savedCount: 1, mode: 'combined' };
  };

  const saveIndividualPages = async (
    selectionResult: PageSelectionResult, 
    title?: string, 
    category?: string, 
    tags?: string[], 
    fileName?: string
  ) => {
    let savedCount = 0;

    for (const page of selectionResult.selectedPages) {
      const content = generateSinglePageNoteContent(page, fileName, selectionResult.originalDocumentStats);
      
      createNote({
        title: `${title || 'OCR'} - Page ${page.pageNumber}${fileName ? ` from ${fileName}` : ''}`,
        content,
        category: category || 'OCR',
        tags: [...(tags || []), 'ocr', 'individual-page', `page-${page.pageNumber}`],
        skipContentCheck: true
      });

      savedCount++;
    }

    return { savedCount, mode: 'individual' };
  };

  const saveBatchPages = async (
    selectionResult: PageSelectionResult, 
    title?: string, 
    category?: string, 
    tags?: string[], 
    fileName?: string
  ) => {
    // Save as combined note with enhanced metadata
    const content = generateBatchPagesNoteContent(selectionResult, fileName);
    
    createNote({
      title: title || `OCR Batch: Pages ${selectionResult.pageRange}${fileName ? ` from ${fileName}` : ''}`,
      content,
      category: category || 'OCR',
      tags: [...(tags || []), 'ocr', 'batch-save', 'selective-pages'],
      skipContentCheck: true
    });

    return { savedCount: 1, mode: 'batch', pageCount: selectionResult.selectedPages.length };
  };

  return {
    saveSelectedPages: saveSelectedPagesMutation.mutate,
    saveIndividualPage: saveIndividualPageMutation.mutate,
    isSaving: saveSelectedPagesMutation.isPending || saveIndividualPageMutation.isPending,
    isDialogOpen,
    setIsDialogOpen
  };
}

// Note content generation helpers
function generateSinglePageNoteContent(
  page: { pageNumber: number; content: string; wordCount: number; characterCount: number },
  fileName?: string,
  originalStats?: any
): string {
  return `<div>
    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
      <p><strong>📄 OCR Extracted Page</strong></p>
      <p><strong>Page:</strong> ${page.pageNumber}${fileName ? ` from ${fileName}` : ''}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Word Count:</strong> ${page.wordCount}</p>
      <p><strong>Character Count:</strong> ${page.characterCount}</p>
      ${originalStats ? `<p><strong>Original Document:</strong> ${originalStats.totalPages} pages total</p>` : ''}
    </div>
    <hr style="margin: 16px 0;" />
    <div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
      ${page.content.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
    </div>
  </div>`;
}

function generateCombinedPagesNoteContent(selectionResult: PageSelectionResult, fileName?: string): string {
  return `<div>
    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
      <p><strong>📄 OCR Selected Pages Combined</strong></p>
      <p><strong>Pages:</strong> ${selectionResult.pageRange}${fileName ? ` from ${fileName}` : ''}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Total Word Count:</strong> ${selectionResult.totalWordCount}</p>
      <p><strong>Total Character Count:</strong> ${selectionResult.totalCharacterCount}</p>
      <p><strong>Selected Pages:</strong> ${selectionResult.selectedPages.length} of ${selectionResult.originalDocumentStats.totalPages}</p>
    </div>
    <hr style="margin: 16px 0;" />
    <div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
      ${selectionResult.combinedText.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
    </div>
  </div>`;
}

function generateBatchPagesNoteContent(selectionResult: PageSelectionResult, fileName?: string): string {
  const pageDetails = selectionResult.selectedPages.map(page => 
    `<li>Page ${page.pageNumber}: ${page.wordCount} words, ${page.characterCount} characters</li>`
  ).join('');

  return `<div>
    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
      <p><strong>📄 OCR Batch Save</strong></p>
      <p><strong>Pages:</strong> ${selectionResult.pageRange}${fileName ? ` from ${fileName}` : ''}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Total Word Count:</strong> ${selectionResult.totalWordCount}</p>
      <p><strong>Page Details:</strong></p>
      <ul style="margin-left: 20px;">
        ${pageDetails}
      </ul>
    </div>
    <hr style="margin: 16px 0;" />
    <div style="white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">
      ${selectionResult.combinedText.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
    </div>
  </div>`;
}
