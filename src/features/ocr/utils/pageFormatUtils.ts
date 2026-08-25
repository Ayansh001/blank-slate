/**
 * Cached regex patterns for better performance
 */
const PAGE_MARKER_REGEX = /=== PAGE (\d+) ===([\s\S]*?)=== END PAGE \1 ===/g;
const PAGE_COUNT_REGEX = /=== PAGE \d+ ===/g;

/**
 * Cache for page-specific regex patterns
 */
const pageRegexCache = new Map<number, RegExp>();

/**
 * Utility functions for handling page formatting in OCR results
 */

export interface ParsedPage {
  pageNumber: number;
  content: string;
}

/**
 * Parse text with page markers into structured page data
 */
export function parsePageMarkers(text: string): ParsedPage[] {
  const pages: ParsedPage[] = [];
  let match;
  
  // Reset regex index to ensure consistent behavior
  PAGE_MARKER_REGEX.lastIndex = 0;
  
  while ((match = PAGE_MARKER_REGEX.exec(text)) !== null) {
    const pageNumber = parseInt(match[1]);
    const content = match[2].trim();
    pages.push({ pageNumber, content });
  }
  
  // If no page markers found, treat as single page
  if (pages.length === 0) {
    pages.push({ pageNumber: 1, content: text });
  }
  
  return pages.sort((a, b) => a.pageNumber - b.pageNumber);
}

/**
 * Format page results into standardized page markers
 */
export function formatWithPageMarkers(pageResults: Array<{ pageNumber: number; text: string }>): string {
  return pageResults
    .map(result => {
      const pageText = result.text.trim();
      return pageText 
        ? `=== PAGE ${result.pageNumber} ===\n${pageText}\n=== END PAGE ${result.pageNumber} ===`
        : `=== PAGE ${result.pageNumber} ===\n[No text found on this page]\n=== END PAGE ${result.pageNumber} ===`;
    })
    .join('\n\n');
}

/**
 * Extract clean text from a single page (removes page markers)
 */
export function extractPageContent(text: string, pageNumber: number): string {
  // Use cached regex for better performance
  let pageRegex = pageRegexCache.get(pageNumber);
  if (!pageRegex) {
    pageRegex = new RegExp(`=== PAGE ${pageNumber} ===[\\s\\S]*?([\\s\\S]*?)=== END PAGE ${pageNumber} ===`);
    pageRegexCache.set(pageNumber, pageRegex);
  }
  
  const match = text.match(pageRegex);
  return match ? match[1].trim() : '';
}

/**
 * Count total pages in formatted text
 */
export function countPages(text: string): number {
  const matches = text.match(PAGE_COUNT_REGEX);
  return matches ? matches.length : 1;
}

/**
 * Get summary statistics for multi-page content
 */
export function getPageStats(text: string): {
  totalPages: number;
  totalWords: number;
  totalCharacters: number;
  averageWordsPerPage: number;
  pagesWithContent: number;
} {
  const pages = parsePageMarkers(text);
  const totalWords = text.split(/\s+/).filter(word => word.length > 0).length;
  const pagesWithContent = pages.filter(page => page.content.trim().length > 0).length;
  
  return {
    totalPages: pages.length,
    totalWords,
    totalCharacters: text.length,
    averageWordsPerPage: Math.round(totalWords / pages.length),
    pagesWithContent
  };
}