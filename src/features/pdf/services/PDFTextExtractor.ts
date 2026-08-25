
import { pdfService } from './PDFService';
import * as pdfjsLib from 'pdfjs-dist';

export interface PDFTextContent {
  text: string;
  pageNumber: number;
  confidence: number;
}

export interface PDFSearchResult {
  text: string;
  pageNumber: number;
  position: { x: number; y: number; width: number; height: number };
}

class PDFTextExtractor {
  private documentCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

  async loadDocument(pdfUrl: string): Promise<pdfjsLib.PDFDocumentProxy> {
    if (this.documentCache.has(pdfUrl)) {
      return this.documentCache.get(pdfUrl)!;
    }

    const pdf = await pdfService.loadDocument(pdfUrl);
    this.documentCache.set(pdfUrl, pdf);
    return pdf;
  }

  async extractTextFromPage(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<PDFTextContent> {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .trim();

    // Estimate confidence based on text quality indicators
    const confidence = this.calculateTextConfidence(text);

    return {
      text,
      pageNumber: pageNum,
      confidence
    };
  }

  async extractAllText(pdfUrl: string): Promise<PDFTextContent[]> {
    const pdf = await this.loadDocument(pdfUrl);
    const results: PDFTextContent[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const textContent = await this.extractTextFromPage(pdf, i);
      results.push(textContent);
    }

    return results;
  }

  async searchInPDF(pdfUrl: string, searchTerm: string): Promise<PDFSearchResult[]> {
    const pdf = await this.loadDocument(pdfUrl);
    const results: PDFSearchResult[] = [];
    const searchRegex = new RegExp(searchTerm, 'gi');

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      textContent.items.forEach((item: any) => {
        if (searchRegex.test(item.str)) {
          results.push({
            text: item.str,
            pageNumber: i,
            position: {
              x: item.transform[4],
              y: item.transform[5],
              width: item.width || 0,
              height: item.height || 0
            }
          });
        }
      });
    }

    return results;
  }

  private calculateTextConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    // Basic heuristics for text quality
    const hasAlpha = /[a-zA-Z]/.test(text);
    const hasNumbers = /\d/.test(text);
    const hasSpaces = /\s/.test(text);
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length;
    
    let confidence = 0.5; // Base confidence
    
    if (hasAlpha) confidence += 0.3;
    if (hasNumbers) confidence += 0.1;
    if (hasSpaces) confidence += 0.2;
    if (specialCharRatio < 0.3) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  clearCache() {
    this.documentCache.clear();
  }
}

export const pdfTextExtractor = new PDFTextExtractor();
