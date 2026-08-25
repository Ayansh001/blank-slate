import { pdfTextExtractor } from '@/features/pdf/services/PDFTextExtractor';

export interface PDFTextExtractionResult {
  text: string;
  confidence: number;
  hasNativeText: boolean;
  pageResults: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
}

class PDFTextExtractionService {
  /**
   * Extract text from PDF using native text extraction first.
   * This is faster and more accurate for text-based PDFs.
   * Returns null if no text is found (likely a scanned PDF that needs OCR).
   */
  async extractNativeText(pdfFile: File | string, pages?: number[]): Promise<PDFTextExtractionResult | null> {
    try {
      let pdfUrl: string;
      
      if (typeof pdfFile === 'string') {
        pdfUrl = pdfFile;
      } else {
        // Convert File to URL
        pdfUrl = URL.createObjectURL(pdfFile);
      }

      const allTextResults = await pdfTextExtractor.extractAllText(pdfUrl);
      
      // Filter by requested pages if specified
      const filteredResults = pages && pages.length > 0 
        ? allTextResults.filter(result => pages.includes(result.pageNumber))
        : allTextResults;

      // Check if we actually found meaningful text
      const totalText = filteredResults.map(r => r.text).join('\n').trim();
      const avgConfidence = filteredResults.reduce((sum, r) => sum + r.confidence, 0) / filteredResults.length;
      
      // Consider it native text if we have reasonable text content
      const hasNativeText = totalText.length > 50 && avgConfidence > 0.6;
      
      if (!hasNativeText) {
        // Clean up object URL if we created one
        if (typeof pdfFile !== 'string') {
          URL.revokeObjectURL(pdfUrl);
        }
        return null;
      }

      return {
        text: totalText,
        confidence: avgConfidence,
        hasNativeText: true,
        pageResults: filteredResults.map(result => ({
          pageNumber: result.pageNumber,
          text: result.text,
          confidence: result.confidence
        }))
      };
    } catch (error) {
      console.error('Native PDF text extraction failed:', error);
      return null;
    }
  }

  /**
   * Check if a PDF likely contains native text (vs being a scanned image)
   */
  async hasNativeTextContent(pdfFile: File | string): Promise<boolean> {
    const result = await this.extractNativeText(pdfFile, [1]); // Just check first page
    return result?.hasNativeText || false;
  }
}

export const pdfTextExtractionService = new PDFTextExtractionService();
export { PDFTextExtractionService };