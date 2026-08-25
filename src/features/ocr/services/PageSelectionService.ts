
import { parsePageMarkers, ParsedPage, getPageStats } from '../utils/pageFormatUtils';

export interface SelectedPageData {
  pageNumber: number;
  content: string;
  wordCount: number;
  characterCount: number;
}

export interface PageSelectionResult {
  selectedPages: SelectedPageData[];
  combinedText: string;
  totalWordCount: number;
  totalCharacterCount: number;
  pageRange: string;
  originalDocumentStats: ReturnType<typeof getPageStats>;
}

export class PageSelectionService {
  private static pageCache = new Map<string, ParsedPage[]>();
  
  /**
   * Extract specific pages from multi-page OCR text
   */
  static extractSelectedPages(
    fullOCRText: string, 
    selectedPageNumbers: number[],
    cacheKey?: string
  ): PageSelectionResult {
    console.log('Extracting selected pages:', { selectedPageNumbers, textLength: fullOCRText.length });
    
    // Check cache first
    let parsedPages: ParsedPage[];
    if (cacheKey && this.pageCache.has(cacheKey)) {
      parsedPages = this.pageCache.get(cacheKey)!;
    } else {
      parsedPages = parsePageMarkers(fullOCRText);
      if (cacheKey) {
        this.pageCache.set(cacheKey, parsedPages);
      }
    }

    // Filter to selected pages only
    const selectedPages: SelectedPageData[] = parsedPages
      .filter(page => selectedPageNumbers.includes(page.pageNumber))
      .map(page => ({
        pageNumber: page.pageNumber,
        content: page.content,
        wordCount: page.content.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: page.content.length
      }))
      .sort((a, b) => a.pageNumber - b.pageNumber);

    // Generate combined text with page markers
    const combinedText = selectedPages
      .map(page => {
        const pageText = page.content.trim();
        return pageText 
          ? `=== PAGE ${page.pageNumber} ===\n${pageText}\n=== END PAGE ${page.pageNumber} ===`
          : `=== PAGE ${page.pageNumber} ===\n[No text found on this page]\n=== END PAGE ${page.pageNumber} ===`;
      })
      .join('\n\n');

    // Calculate totals
    const totalWordCount = selectedPages.reduce((sum, page) => sum + page.wordCount, 0);
    const totalCharacterCount = selectedPages.reduce((sum, page) => sum + page.characterCount, 0);

    // Generate page range string
    const pageRange = this.generatePageRangeString(selectedPageNumbers);

    // Get original document stats
    const originalDocumentStats = getPageStats(fullOCRText);

    return {
      selectedPages,
      combinedText,
      totalWordCount,
      totalCharacterCount,
      pageRange,
      originalDocumentStats
    };
  }

  /**
   * Generate a human-readable page range string (e.g., "2, 5, 7-9")
   */
  static generatePageRangeString(pageNumbers: number[]): string {
    if (pageNumbers.length === 0) return '';
    if (pageNumbers.length === 1) return pageNumbers[0].toString();

    const sorted = [...pageNumbers].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          ranges.push(start.toString());
        } else if (end === start + 1) {
          ranges.push(`${start}, ${end}`);
        } else {
          ranges.push(`${start}-${end}`);
        }
        start = sorted[i];
        end = sorted[i];
      }
    }

    // Handle the last range
    if (start === end) {
      ranges.push(start.toString());
    } else if (end === start + 1) {
      ranges.push(`${start}, ${end}`);
    } else {
      ranges.push(`${start}-${end}`);
    }

    return ranges.join(', ');
  }

  /**
   * Clear cache for memory management
   */
  static clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.pageCache.delete(cacheKey);
    } else {
      this.pageCache.clear();
    }
  }

  /**
   * Get available pages from OCR text
   */
  static getAvailablePages(fullOCRText: string): ParsedPage[] {
    return parsePageMarkers(fullOCRText);
  }

  /**
   * Validate page selection
   */
  static validatePageSelection(
    fullOCRText: string, 
    selectedPageNumbers: number[]
  ): { valid: boolean; availablePages: number[]; invalidPages: number[] } {
    const availablePages = this.getAvailablePages(fullOCRText);
    const availablePageNumbers = availablePages.map(p => p.pageNumber);
    const invalidPages = selectedPageNumbers.filter(num => !availablePageNumbers.includes(num));

    return {
      valid: invalidPages.length === 0,
      availablePages: availablePageNumbers,
      invalidPages
    };
  }
}
